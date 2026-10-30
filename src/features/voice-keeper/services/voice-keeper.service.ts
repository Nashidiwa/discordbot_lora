import {
  type VoiceConnection,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} from '@discordjs/voice';
import {
  ChannelType,
  type Client,
  type Guild,
  type NonThreadGuildBasedChannel,
  PermissionFlagsBits,
  type VoiceState,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../core/logger.js';
import { registerCleanupHook } from '../../../core/lifecycle.js';
import { db } from '../../../shared/db/client.js';
import { VoiceKeeperConstants } from '../voice-keeper.constants.js';
import {
  VoiceConnectionStatusType,
  type VoiceSession,
  type VoiceStatusResult,
} from '../voice-keeper.types.js';

export class VoiceKeeperService {
  private readonly sessions = new Map<string, VoiceSession>();
  private isShuttingDown = false;

  constructor() {
    // Đăng ký hook dọn dẹp an toàn vào lifecycle shutdown của bot
    registerCleanupHook(() => {
      this.destroyAllConnections();
    });
  }

  /**
   * Khởi tạo và tham gia kênh thoại cho một Guild
   */
  public async connect(options: {
    guild: Guild;
    channelId: string;
    selfDeaf?: boolean;
    selfMute?: boolean;
    autoReconnect?: boolean;
    updatedBy?: string;
    isManual?: boolean;
  }): Promise<VoiceConnection> {
    if (this.isShuttingDown) {
      throw new AppError(
        'Hệ thống đang tắt máy, từ chối khởi tạo kết nối thoại mới.',
        'SYSTEM_SHUTTING_DOWN',
        true,
      );
    }

    const { guild, channelId } = options;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (
      !channel ||
      (channel.type !== ChannelType.GuildVoice &&
        channel.type !== ChannelType.GuildStageVoice)
    ) {
      throw new AppError(
        'Kênh được chọn không phải là kênh thoại (Voice hoặc Stage) hợp lệ.',
        'INVALID_VOICE_CHANNEL',
        true,
      );
    }

    const botMember = guild.members.me ?? (await guild.members.fetchMe());
    const permissions = channel.permissionsFor(botMember);

    if (!permissions.has(PermissionFlagsBits.Connect)) {
      throw new AppError(
        'Bot không có quyền Connect (Kết nối) vào kênh thoại này.',
        'VOICE_NO_CONNECT_PERMISSION',
        true,
      );
    }

    if (!permissions.has(PermissionFlagsBits.Speak)) {
      throw new AppError(
        'Bot không có quyền Speak (Nói) vào kênh thoại này.',
        'VOICE_NO_SPEAK_PERMISSION',
        true,
      );
    }

    const selfDeaf = options.selfDeaf ?? VoiceKeeperConstants.DEFAULT_SELF_DEAF;
    const selfMute = options.selfMute ?? VoiceKeeperConstants.DEFAULT_SELF_MUTE;
    const autoReconnect =
      options.autoReconnect ?? VoiceKeeperConstants.DEFAULT_AUTO_RECONNECT;

    // Hủy timer reconnect cũ nếu có
    const existingSession = this.sessions.get(guild.id);
    if (existingSession?.reconnectTimer) {
      clearTimeout(existingSession.reconnectTimer);
      existingSession.reconnectTimer = null;
    }

    let connection = getVoiceConnection(guild.id);

    const shouldRecreate =
      !connection ||
      connection.joinConfig.channelId !== channelId ||
      options.isManual ||
      connection.state.status !== VoiceConnectionStatus.Ready ||
      connection.joinConfig.selfDeaf !== selfDeaf ||
      connection.joinConfig.selfMute !== selfMute;

    if (shouldRecreate) {
      if (connection) {
        connection.destroy();
      }

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf,
        selfMute,
      });

      this.setupConnectionListeners(connection, guild, channel.id);
    }

    if (!connection) {
      throw new AppError(
        'Không thể khởi tạo kết nối kênh thoại.',
        'VOICE_CONNECTION_INIT_FAILED',
        false,
      );
    }

    const activeConnection: VoiceConnection = connection;

    // Cập nhật cấu hình DB
    await db.voiceKeeperConfig.upsert({
      where: { guildId: guild.id },
      create: {
        guildId: guild.id,
        channelId: channel.id,
        isEnabled: true,
        selfDeaf,
        selfMute,
        autoReconnect,
        updatedBy: options.updatedBy ?? null,
        lastConnectedAt: new Date(),
      },
      update: {
        channelId: channel.id,
        isEnabled: true,
        selfDeaf,
        selfMute,
        autoReconnect,
        ...(options.updatedBy ? { updatedBy: options.updatedBy } : {}),
        lastConnectedAt: new Date(),
      },
    });

    // Cập nhật hoặc tạo mới session trong RAM
    const session: VoiceSession = {
      guildId: guild.id,
      channelId: channel.id,
      connection: activeConnection,
      status:
        activeConnection.state.status === VoiceConnectionStatus.Ready
          ? VoiceConnectionStatusType.READY
          : VoiceConnectionStatusType.CONNECTING,
      reconnectAttempts: options.isManual ? 0 : (existingSession?.reconnectAttempts ?? 0),
      reconnectTimer: null,
      connectedAt:
        activeConnection.state.status === VoiceConnectionStatus.Ready
          ? new Date()
          : existingSession?.connectedAt ?? null,
      lastPing: activeConnection.ping?.ws ?? null,
    };
    this.sessions.set(guild.id, session);

    logger.info(
      {
        guildId: guild.id,
        channelId: channel.id,
        selfDeaf,
        selfMute,
        autoReconnect,
      },
      'Voice Keeper connection established/updated',
    );

    return activeConnection;
  }

  /**
   * Thiết lập các event listeners cho một VoiceConnection
   */
  private setupConnectionListeners(
    connection: VoiceConnection,
    guild: Guild,
    channelId: string,
  ): void {
    connection.on(VoiceConnectionStatus.Ready, () => {
      const session = this.sessions.get(guild.id);
      if (session) {
        session.status = VoiceConnectionStatusType.READY;
        session.connectedAt = new Date();
        session.reconnectAttempts = 0;
        session.lastPing = connection.ping?.ws ?? null;
      }

      logger.info(
        { guildId: guild.id, channelId },
        'Voice connection entered READY state',
      );
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (this.isShuttingDown) return;

      const session = this.sessions.get(guild.id);
      if (session) {
        session.status = VoiceConnectionStatusType.DISCONNECTED;
      }

      logger.warn(
        { guildId: guild.id, channelId },
        'Voice connection entered DISCONNECTED state',
      );

      try {
        // Chờ xem có thể tự kết nối lại trong vài giây không (chuyển vùng server)
        await Promise.race([
          entersState(
            connection,
            VoiceConnectionStatus.Signalling,
            VoiceKeeperConstants.DISCONNECT_GRACE_TIMEOUT_MS,
          ),
          entersState(
            connection,
            VoiceConnectionStatus.Connecting,
            VoiceKeeperConstants.DISCONNECT_GRACE_TIMEOUT_MS,
          ),
        ]);
      } catch {
        // Nếu không tự phục hồi, hủy connection cũ và kích hoạt hàng đợi reconnect
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
        void this.scheduleReconnect(guild, channelId);
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      const session = this.sessions.get(guild.id);
      if (session && session.status !== VoiceConnectionStatusType.IDLE) {
        session.status = VoiceConnectionStatusType.DISCONNECTED;
        session.connection = null;
      }
      logger.debug(
        { guildId: guild.id, channelId },
        'Voice connection destroyed',
      );
    });

    connection.on('error', (err: unknown) => {
      logger.error(
        { err, guildId: guild.id, channelId },
        'Voice connection encountered an error',
      );
    });
  }

  /**
   * Lên lịch tự động kết nối lại theo cơ chế Exponential Backoff
   */
  public async scheduleReconnect(
    guild: Guild,
    channelId: string,
  ): Promise<void> {
    if (this.isShuttingDown) return;

    const existingSession = this.sessions.get(guild.id);
    if (
      existingSession?.reconnectTimer ||
      existingSession?.isConnecting ||
      existingSession?.status === VoiceConnectionStatusType.IDLE
    ) {
      return;
    }

    const config = await db.voiceKeeperConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!config || !config.isEnabled || !config.autoReconnect) {
      logger.debug(
        { guildId: guild.id },
        'Auto-reconnect skipped: Voice Keeper disabled or not configured',
      );
      return;
    }

    const session = this.sessions.get(guild.id) ?? {
      guildId: guild.id,
      channelId,
      connection: null,
      status: VoiceConnectionStatusType.RECONNECTING,
      reconnectAttempts: 0,
      reconnectTimer: null,
      connectedAt: null,
      lastPing: null,
    };

    if (session.reconnectTimer) {
      logger.debug(
        { guildId: guild.id, channelId },
        'Reconnect timer already active, skipping duplicate schedule',
      );
      return;
    }

    // Circuit Breaker: Kiểm tra ngưỡng retry tối đa
    if (session.reconnectAttempts >= VoiceKeeperConstants.MAX_RECONNECT_ATTEMPTS) {
      session.status = VoiceConnectionStatusType.SUSPENDED;
      this.sessions.set(guild.id, session);

      logger.warn(
        {
          guildId: guild.id,
          channelId,
          attempts: session.reconnectAttempts,
        },
        'Max reconnect attempts reached. Voice Keeper suspended (Circuit Breaker tripped)',
      );
      return;
    }

    session.status = VoiceConnectionStatusType.RECONNECTING;
    const delay =
      VoiceKeeperConstants.RECONNECT_DELAYS_MS[session.reconnectAttempts] ??
      180_000;
    session.reconnectAttempts++;
    this.sessions.set(guild.id, session);

    logger.info(
      {
        guildId: guild.id,
        channelId,
        attempt: session.reconnectAttempts,
        delayMs: delay,
      },
      'Scheduling Voice Keeper auto-reconnect',
    );

    session.reconnectTimer = setTimeout(async () => {
      try {
        session.isConnecting = true;
        await this.connect({
          guild,
          channelId,
          selfDeaf: config.selfDeaf,
          selfMute: config.selfMute,
          autoReconnect: config.autoReconnect,
          isManual: false,
        });
      } catch (err: unknown) {
        logger.error(
          { err, guildId: guild.id, channelId },
          'Scheduled auto-reconnect attempt failed',
        );
        void this.scheduleReconnect(guild, channelId);
      } finally {
        session.isConnecting = false;
        session.reconnectTimer = null;
      }
    }, delay);
  }

  /**
   * Xử lý sự kiện voiceStateUpdate của bot (bị kick, disconnect, hoặc move)
   */
  public async handleBotVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    const guild = newState.guild;
    const botId = newState.client.user?.id;

    if (!botId || newState.id !== botId) {
      return;
    }

    const config = await db.voiceKeeperConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!config || !config.isEnabled) {
      return;
    }

    // Trường hợp 1: Bot bị ngắt kết nối (bị kick hoặc disconnect)
    if (oldState.channelId !== null && newState.channelId === null) {
      logger.warn(
        { guildId: guild.id, channelId: oldState.channelId },
        'Bot was disconnected from voice channel unexpectedly',
      );

      const session = this.sessions.get(guild.id);
      if (session) {
        session.status = VoiceConnectionStatusType.DISCONNECTED;
      }

      if (config.autoReconnect) {
        void this.scheduleReconnect(guild, config.channelId);
      }
      return;
    }

    // Trường hợp 2: Bot bị di chuyển sang kênh thoại khác
    if (
      newState.channelId !== null &&
      newState.channelId !== config.channelId
    ) {
      logger.info(
        {
          guildId: guild.id,
          targetChannelId: config.channelId,
          currentChannelId: newState.channelId,
        },
        'Bot was moved to a different channel; moving back to configured 24/7 channel',
      );

      // Tự động di chuyển lại về kênh đã cấu hình nếu còn bật autoReconnect
      if (config.autoReconnect) {
        try {
          await this.connect({
            guild,
            channelId: config.channelId,
            selfDeaf: config.selfDeaf,
            selfMute: config.selfMute,
            autoReconnect: config.autoReconnect,
            isManual: true,
          });
        } catch (err: unknown) {
          logger.error(
            { err, guildId: guild.id, channelId: config.channelId },
            'Failed to return bot to configured 24/7 channel',
          );
        }
      }
    }
  }

  /**
   * Xử lý khi kênh thoại bị xóa khỏi Guild
   */
  public async handleChannelDelete(
    channel: NonThreadGuildBasedChannel,
  ): Promise<void> {
    const guildId = channel.guild.id;
    const config = await db.voiceKeeperConfig.findUnique({
      where: { guildId },
    });

    if (!config || config.channelId !== channel.id) {
      return;
    }

    logger.warn(
      { guildId, channelId: channel.id },
      'Configured Voice Keeper channel was deleted. Disabling Voice Keeper for guild',
    );

    await this.disconnect(guildId);
  }

  /**
   * Ngắt kết nối và tắt trạng thái Voice Keeper cho Guild
   */
  public async disconnect(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (session) {
      if (session.reconnectTimer) {
        clearTimeout(session.reconnectTimer);
        session.reconnectTimer = null;
      }
      session.status = VoiceConnectionStatusType.IDLE;
      session.connection = null;
      session.reconnectAttempts = 0;
    }

    // Cập nhật DB trước khi destroy connection để tránh race-condition với listener Disconnected
    await db.voiceKeeperConfig.updateMany({
      where: { guildId },
      data: { isEnabled: false },
    });

    const connection = getVoiceConnection(guildId);
    if (connection) {
      connection.destroy();
    }

    logger.info({ guildId }, 'Voice Keeper disconnected and disabled');
  }

  /**
   * Ép kết nối lại tức thì (Manual Force Reconnect)
   */
  public async forceReconnect(
    guild: Guild,
    updatedBy: string,
  ): Promise<VoiceConnection> {
    const config = await db.voiceKeeperConfig.findUnique({
      where: { guildId: guild.id },
    });

    if (!config) {
      throw new AppError(
        'Máy chủ này chưa được cấu hình Voice Keeper 24/7.',
        'VOICE_KEEPER_NOT_CONFIGURED',
        true,
      );
    }

    return this.connect({
      guild,
      channelId: config.channelId,
      selfDeaf: config.selfDeaf,
      selfMute: config.selfMute,
      autoReconnect: config.autoReconnect,
      updatedBy,
      isManual: true,
    });
  }

  /**
   * Lấy thông tin trạng thái Voice Keeper của một Guild
   */
  public async getStatus(guild: Guild): Promise<VoiceStatusResult> {
    const config = await db.voiceKeeperConfig.findUnique({
      where: { guildId: guild.id },
    });

    const session = this.sessions.get(guild.id);
    const connection = getVoiceConnection(guild.id);

    let channelName: string | null = null;
    if (config?.channelId) {
      const ch = await guild.channels.fetch(config.channelId).catch(() => null);
      if (ch) {
        channelName = ch.name;
      }
    }

    let status: VoiceConnectionStatusType = VoiceConnectionStatusType.IDLE;
    if (config?.isEnabled) {
      if (session?.status) {
        status = session.status;
      } else if (connection?.state.status === VoiceConnectionStatus.Ready) {
        status = VoiceConnectionStatusType.READY;
      } else {
        status = VoiceConnectionStatusType.DISCONNECTED;
      }
    }

    return {
      guildId: guild.id,
      channelId: config?.channelId ?? null,
      channelName,
      isEnabled: config?.isEnabled ?? false,
      status,
      selfDeaf: config?.selfDeaf ?? VoiceKeeperConstants.DEFAULT_SELF_DEAF,
      selfMute: config?.selfMute ?? VoiceKeeperConstants.DEFAULT_SELF_MUTE,
      autoReconnect:
        config?.autoReconnect ?? VoiceKeeperConstants.DEFAULT_AUTO_RECONNECT,
      lastConnectedAt: config?.lastConnectedAt ?? null,
      reconnectAttempts: session?.reconnectAttempts ?? 0,
      ping: connection?.ping?.ws ?? session?.lastPing ?? null,
    };
  }

  /**
   * Quét DB và tự động nạp lại toàn bộ kết nối active khi bot khởi động
   */
  public async initAllActiveConnections(client: Client): Promise<number> {
    logger.info('Initializing active Voice Keeper connections on bot startup...');

    let loadedCount = 0;
    try {
      const activeConfigs = await db.voiceKeeperConfig.findMany({
        where: { isEnabled: true },
      });

      for (const conf of activeConfigs) {
        const guild = client.guilds.cache.get(conf.guildId);
        if (!guild) {
          logger.warn(
            { guildId: conf.guildId },
            'Guild not found in client cache during voice keeper boot',
          );
          continue;
        }

        try {
          await this.connect({
            guild,
            channelId: conf.channelId,
            selfDeaf: conf.selfDeaf,
            selfMute: conf.selfMute,
            autoReconnect: conf.autoReconnect,
            isManual: false,
          });
          loadedCount++;
        } catch (err: unknown) {
          logger.error(
            { err, guildId: conf.guildId, channelId: conf.channelId },
            'Failed to auto-connect voice keeper on startup',
          );
          void this.scheduleReconnect(guild, conf.channelId);
        }
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Error querying active Voice Keeper configs');
    }

    logger.info(
      { loadedCount },
      'Active Voice Keeper connections initialized',
    );
    return loadedCount;
  }

  /**
   * Giám sát định kỳ (Watchdog) nhằm tự động phục hồi kết nối bị đứt ngầm
   */
  public async checkHealth(client: Client): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      const activeConfigs = await db.voiceKeeperConfig.findMany({
        where: { isEnabled: true, autoReconnect: true },
      });

      for (const config of activeConfigs) {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        const connection = getVoiceConnection(guild.id);
        const session = this.sessions.get(guild.id);

        const isConnectionDead =
          !connection ||
          connection.state.status === VoiceConnectionStatus.Destroyed ||
          connection.state.status === VoiceConnectionStatus.Disconnected;
        const isReconnecting =
          (session?.reconnectTimer !== null || session?.isConnecting === true) &&
          session?.status === VoiceConnectionStatusType.RECONNECTING;
        const isSuspended =
          session?.status === VoiceConnectionStatusType.SUSPENDED;

        if (isConnectionDead && !isReconnecting && !isSuspended) {
          logger.info(
            { guildId: guild.id, channelId: config.channelId },
            'Watchdog found dead voice connection; triggering auto-recovery',
          );
          void this.scheduleReconnect(guild, config.channelId);
        }
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Error during Voice Keeper health check');
    }
  }

  /**
   * Dọn dẹp sạch sẽ toàn bộ Voice Connections (khi graceful shutdown)
   */
  public destroyAllConnections(): void {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info('Cleaning up all active Voice Keeper connections...');
    for (const [guildId, session] of this.sessions.entries()) {
      if (session.reconnectTimer) {
        clearTimeout(session.reconnectTimer);
        session.reconnectTimer = null;
      }

      const connection = getVoiceConnection(guildId) ?? session.connection;
      if (connection) {
        try {
          connection.destroy();
        } catch (err: unknown) {
          logger.error({ err, guildId }, 'Error destroying voice connection');
        }
      }
    }

    this.sessions.clear();
    logger.info('All Voice Keeper connections destroyed cleanly');
  }
}

export const voiceKeeperService = new VoiceKeeperService();
