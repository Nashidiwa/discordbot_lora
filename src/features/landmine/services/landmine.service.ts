import {
  type Client,
  type Message,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import { logger } from '../../../core/logger.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import {
  AlgorithmType,
  DefaultModuleKey,
  LandmineLimits,
  LandmineVisuals,
  LeaderboardSortType,
  ScopeType,
} from '../landmine.constants.js';
import { landmineLocale } from '../landmine.locale.js';
import type {
  ActiveModuleRuntime,
  CreateModuleInput,
  EditModuleInput,
  LeaderboardEntry,
  LeaderboardResult,
} from '../landmine.types.js';

export function normalizeModuleKey(rawKey: string): string {
  const trimmed = rawKey.trim().toLowerCase();
  if (
    trimmed === DefaultModuleKey.FOUNDATION ||
    trimmed === 'm1' ||
    trimmed === '1'
  ) {
    return DefaultModuleKey.FOUNDATION;
  }
  if (
    trimmed === DefaultModuleKey.ADVANCED ||
    trimmed === 'm2' ||
    trimmed === '2'
  ) {
    return DefaultModuleKey.ADVANCED;
  }
  if (trimmed.startsWith('m')) {
    return trimmed;
  }
  const num = parseInt(trimmed, 10);
  if (
    !Number.isNaN(num) &&
    num >= 1 &&
    num <= LandmineLimits.MAX_CUSTOM_MODULES
  ) {
    if (num === 1) return DefaultModuleKey.FOUNDATION;
    if (num === 2) return DefaultModuleKey.ADVANCED;
    return `m${num}`;
  }
  return trimmed;
}

export function getModuleRank(moduleKey: string): number {
  const lower = moduleKey.toLowerCase();
  if (lower === DefaultModuleKey.FOUNDATION || lower === 'm1') return 1;
  if (lower === DefaultModuleKey.ADVANCED || lower === 'm2') return 2;
  const match = lower.match(/^m(\d+)$/);
  if (match) {
    return parseInt(match[1]!, 10);
  }
  return 999;
}

export function getModuleDisplayName(moduleKey: string): string {
  const lower = moduleKey.toLowerCase();
  if (lower === DefaultModuleKey.FOUNDATION || lower === 'm1') {
    return 'M1 (Foundation)';
  }
  if (lower === DefaultModuleKey.ADVANCED || lower === 'm2') {
    return 'M2 (Advanced)';
  }
  return moduleKey.toUpperCase();
}

export function extractSnowflakeIds(input?: string | null): string[] {
  if (!input) return [];
  const matches = input.match(/\d{17,20}/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export function formatExplosionMessage(
  template: string,
  userId: string,
): string {
  return template.replace(
    /<@user>|<@userId>|@username|@user|\{username\}|\{user\}|\{userId\}|<user>/gi,
    `<@${userId}>`,
  );
}

export class LandmineService {
  private activeModulesCache = new Map<string, ActiveModuleRuntime[]>();
  private guildLocaleCache = new Map<string, string | null>();
  private ensureModulesPromises = new Map<string, Promise<void>>();

  public parseJsonArray(raw?: string | null): string[] {
    if (!raw || typeof raw !== 'string' || raw.trim() === '') {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === 'string',
        );
      }
      return [];
    } catch {
      return [];
    }
  }

  public formatDurationSeconds(seconds: number, lang: 'vi' | 'en'): string {
    if (seconds < 60) {
      return lang === 'en' ? `${seconds}s` : `${seconds} giây`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return lang === 'en' ? `${minutes}m` : `${minutes} phút`;
      }
      return lang === 'en'
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes} phút ${remainingSeconds} giây`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return lang === 'en' ? `${hours}h` : `${hours} giờ`;
    }
    return lang === 'en'
      ? `${hours}h ${remainingMinutes}m`
      : `${hours} giờ ${remainingMinutes} phút`;
  }

  public parseDurationString(input: string): number {
    const trimmed = input.trim().toLowerCase();
    const match = trimmed.match(/^(\d+)(s|m|h|d)?$/);
    if (!match) {
      const parsedNum = Number(trimmed);
      if (
        !Number.isNaN(parsedNum) &&
        Number.isFinite(parsedNum) &&
        parsedNum > 0
      ) {
        return Math.floor(parsedNum);
      }
      throw new AppError(
        landmineLocale.vi.INVALID_DURATION,
        'INVALID_DURATION',
        true,
      );
    }
    const value = parseInt(match[1]!, 10);
    if (!Number.isFinite(value) || value <= 0) {
      throw new AppError(
        landmineLocale.vi.INVALID_DURATION,
        'INVALID_DURATION',
        true,
      );
    }
    const unit = match[2] ?? 's';
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }

  public async initCache(_client?: Client<true>): Promise<void> {
    try {
      // 1. Nạp guild forced locale
      const guildConfigs = await db.landmineGuildConfig.findMany();
      this.guildLocaleCache.clear();
      for (const gc of guildConfigs) {
        this.guildLocaleCache.set(gc.guildId, gc.forcedLocale);
      }

      // 2. Nạp các module active
      const activeModules = await db.landmineModule.findMany({
        where: { isEnabled: true },
      });

      this.activeModulesCache.clear();
      for (const m of activeModules) {
        const runtime: ActiveModuleRuntime = {
          id: m.id,
          guildId: m.guildId,
          moduleKey: m.moduleKey,
          isDefault: m.isDefault,
          isEnabled: m.isEnabled,
          note: m.note,
          algorithmType: m.algorithmType as ActiveModuleRuntime['algorithmType'],
          staticRate: m.staticRate,
          punishmentDurationSeconds: m.punishmentDurationSeconds,
          channelScopeType: m.channelScopeType as ScopeType,
          channelIds: this.parseJsonArray(m.channelIds),
          roleScopeType: m.roleScopeType as ScopeType,
          roleIds: this.parseJsonArray(m.roleIds),
          includeInServerLeaderboard: m.includeInServerLeaderboard,
          autoDeleteNotification: m.autoDeleteNotification,
          successMessage: m.successMessage,
          failedMessage: m.failedMessage,
        };

        const existing = this.activeModulesCache.get(m.guildId) ?? [];
        existing.push(runtime);
        this.activeModulesCache.set(m.guildId, existing);
      }

      // Đảm bảo thứ tự thực thi First-Hit Stop chuẩn M1 -> M2 -> M3..M10
      for (const [guildId, list] of this.activeModulesCache.entries()) {
        list.sort(
          (a, b) => getModuleRank(a.moduleKey) - getModuleRank(b.moduleKey),
        );
        this.activeModulesCache.set(guildId, list);
      }

      logger.info(
        {
          activeGuildsCount: this.activeModulesCache.size,
          activeModulesCount: activeModules.length,
        },
        'Landmine in-memory cache successfully initialized',
      );
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to initialize Landmine in-memory cache');
    }
  }

  public async refreshGuildCache(guildId: string): Promise<void> {
    const [guildConfig, activeModules] = await Promise.all([
      db.landmineGuildConfig.findUnique({ where: { guildId } }),
      db.landmineModule.findMany({ where: { guildId, isEnabled: true } }),
    ]);

    this.guildLocaleCache.set(guildId, guildConfig?.forcedLocale ?? null);

    const runtimeList: ActiveModuleRuntime[] = activeModules.map((m) => ({
      id: m.id,
      guildId: m.guildId,
      moduleKey: m.moduleKey,
      isDefault: m.isDefault,
      isEnabled: m.isEnabled,
      note: m.note,
      algorithmType: m.algorithmType as ActiveModuleRuntime['algorithmType'],
      staticRate: m.staticRate,
      punishmentDurationSeconds: m.punishmentDurationSeconds,
      channelScopeType: m.channelScopeType as ScopeType,
      channelIds: this.parseJsonArray(m.channelIds),
      roleScopeType: m.roleScopeType as ScopeType,
      roleIds: this.parseJsonArray(m.roleIds),
      includeInServerLeaderboard: m.includeInServerLeaderboard,
      autoDeleteNotification: m.autoDeleteNotification,
      successMessage: m.successMessage,
      failedMessage: m.failedMessage,
    }));

    // Sắp xếp thứ tự ưu tiên First-Hit Stop theo module index
    runtimeList.sort(
      (a, b) => getModuleRank(a.moduleKey) - getModuleRank(b.moduleKey),
    );

    if (runtimeList.length > 0) {
      this.activeModulesCache.set(guildId, runtimeList);
    } else {
      this.activeModulesCache.delete(guildId);
    }
  }

  public async ensureDefaultModules(guildId: string): Promise<void> {
    const existing = this.ensureModulesPromises.get(guildId);
    if (existing) {
      return existing;
    }

    const task = (async () => {
      try {
        await Promise.all([
          db.landmineModule.upsert({
            where: {
              guildId_moduleKey: {
                guildId,
                moduleKey: DefaultModuleKey.FOUNDATION,
              },
            },
            update: {},
            create: {
              guildId,
              moduleKey: DefaultModuleKey.FOUNDATION,
              isDefault: true,
              isEnabled: false,
              note: 'Mìn cơ bản cố định (0.8% - 1m)',
              algorithmType: AlgorithmType.STATIC,
              staticRate: 0.008,
              punishmentDurationSeconds: 60,
              channelScopeType: ScopeType.ALL,
              channelIds: '[]',
              roleScopeType: ScopeType.BLACKLIST,
              roleIds: '[]',
              includeInServerLeaderboard: true,
              autoDeleteNotification: false,
            },
          }),
          db.landmineModule.upsert({
            where: {
              guildId_moduleKey: {
                guildId,
                moduleKey: DefaultModuleKey.ADVANCED,
              },
            },
            update: {},
            create: {
              guildId,
              moduleKey: DefaultModuleKey.ADVANCED,
              isDefault: true,
              isEnabled: false,
              note: 'Mìn hỗn loạn 2 tầng (RM x PM)',
              algorithmType: AlgorithmType.DYNAMIC_CHAOS,
              staticRate: 0,
              punishmentDurationSeconds: 0,
              channelScopeType: ScopeType.ALL,
              channelIds: '[]',
              roleScopeType: ScopeType.BLACKLIST,
              roleIds: '[]',
              includeInServerLeaderboard: true,
              autoDeleteNotification: false,
            },
          }),
        ]);
      } catch (err: unknown) {
        // Phòng thủ race condition SQLite P2002: Nếu bản ghi đã được tạo bởi request đồng thời khác, an toàn bỏ qua
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          err.code === 'P2002'
        ) {
          return;
        }
        throw err;
      } finally {
        this.ensureModulesPromises.delete(guildId);
      }
    })();

    this.ensureModulesPromises.set(guildId, task);
    return task;
  }

  public async evaluateMessage(message: Message): Promise<void> {
    if (
      !message.guild ||
      !message.guildId ||
      message.author.bot ||
      Boolean(message.webhookId) ||
      message.system ||
      !message.member
    ) {
      return;
    }

    // 1. Kiểm tra thành viên đã bị timeout chưa
    if (message.member.isCommunicationDisabled()) {
      return;
    }

    const activeModules = this.activeModulesCache.get(message.guildId);
    if (!activeModules || activeModules.length === 0) {
      return;
    }

    const channelId = message.channelId;
    const memberRoleIds = message.member.roles.cache.map((r) => r.id);

    // 2. Duyệt qua từng module (Quy tắc First-Hit Stop theo thứ tự module rank)
    for (const mod of activeModules) {
      // 2.1. Kiểm tra Channel Scope
      if (mod.channelScopeType === ScopeType.WHITELIST) {
        if (!mod.channelIds.includes(channelId)) continue;
      } else if (mod.channelScopeType === ScopeType.BLACKLIST) {
        if (mod.channelIds.includes(channelId)) continue;
      }

      // 2.2. Kiểm tra Role Scope
      if (mod.roleScopeType === ScopeType.WHITELIST) {
        const hasWhitelistedRole = mod.roleIds.some((id) =>
          memberRoleIds.includes(id),
        );
        if (!hasWhitelistedRole) continue;
      } else if (mod.roleScopeType === ScopeType.BLACKLIST) {
        const hasBlacklistedRole = mod.roleIds.some((id) =>
          memberRoleIds.includes(id),
        );
        if (hasBlacklistedRole) continue;
      }

      // 2.3. Thực hiện quay số ngẫu nhiên
      let isHit = false;
      let finalDurationSec = 60;
      let rollDetails: {
        tier?: number;
        rm?: number;
        pm?: number;
        baseRatePercent?: number;
      } = {};

      if (mod.algorithmType === AlgorithmType.STATIC) {
        const roll = Math.random();
        if (roll < mod.staticRate) {
          isHit = true;
          finalDurationSec = mod.punishmentDurationSeconds;
        }
      } else if (mod.algorithmType === AlgorithmType.DYNAMIC_CHAOS) {
        // Tầng 1: 50% cơ hội tham gia xổ số
        if (Math.random() < 0.5) {
          // Rate Multiplier ∈ {1, 2, 3}
          const rm = Math.floor(Math.random() * 3) + 1;

          // 3 Tier phân dải xác suất tích lũy độc lập (Mutually Exclusive)
          const rate1 = 0.001 * rm; // Tier 1: 5m
          const rate2 = 0.003 * rm; // Tier 2: 2m
          const rate3 = 0.01 * rm; // Tier 3: 1m

          const lotteryRoll = Math.random();

          let selectedTier: number | null = null;
          let baseDurationSec = 60;
          let baseRatePercent = 1.0;

          if (lotteryRoll < rate1) {
            selectedTier = 1;
            baseDurationSec = 300; // 5m
            baseRatePercent = 0.1 * rm;
          } else if (lotteryRoll < rate1 + rate2) {
            selectedTier = 2;
            baseDurationSec = 120; // 2m
            baseRatePercent = 0.3 * rm;
          } else if (lotteryRoll < rate1 + rate2 + rate3) {
            selectedTier = 3;
            baseDurationSec = 60; // 1m
            baseRatePercent = 1.0 * rm;
          }

          if (selectedTier !== null) {
            // Punishment Multiplier ∈ {1, 2, 3}
            const pm = Math.floor(Math.random() * 3) + 1;
            isHit = true;
            finalDurationSec = baseDurationSec * pm;
            rollDetails = {
              tier: selectedTier,
              rm,
              pm,
              baseRatePercent,
            };
          }
        }
      }

      // 2.4. Xử lý khi giẫm phải mìn
      if (isHit) {
        await this.handleExplosionTrigger(
          message,
          mod,
          finalDurationSec,
          rollDetails,
        );
        // First-Hit Stop: Dừng ngay, không xét module tiếp theo
        break;
      }
    }
  }

  private async handleExplosionTrigger(
    message: Message,
    mod: ActiveModuleRuntime,
    durationSeconds: number,
    rollDetails: {
      tier?: number;
      rm?: number;
      pm?: number;
      baseRatePercent?: number;
    },
  ): Promise<void> {
    const guild = message.guild!;
    const member = message.member!;
    const userId = member.id;
    const guildId = guild.id;

    // 1. Xác định ngôn ngữ hiển thị Embed
    const forced = this.guildLocaleCache.get(guildId);
    let lang: 'vi' | 'en' = 'vi';
    if (forced === 'vi' || forced === 'en') {
      lang = forced;
    } else {
      lang = await getUserLocale({ guildId });
    }
    const t = landmineLocale[lang];

    // 2. Thử gọi Discord API cấm chat (Timeout)
    let isSuccess = false;
    const safeDurationMs = Math.min(
      Math.max(
        Math.floor(durationSeconds * 1000),
        LandmineLimits.MIN_PUNISHMENT_SECONDS * 1000,
      ),
      LandmineLimits.MAX_DISCORD_TIMEOUT_MS,
    );

    // Kiểm tra quyền hạn trước bằng member.moderatable để tránh HTTP 403 Forbidden không cần thiết
    if (!member.moderatable) {
      isSuccess = false;
      logger.info(
        { userId, guildId, moduleKey: mod.moduleKey },
        'Landmine explosion bypassed due to member hierarchy (member is not moderatable)',
      );
    } else {
      try {
        await member.timeout(
          safeDurationMs,
          `Landmine triggered: ${mod.moduleKey}`,
        );
        isSuccess = true;
      } catch (err: unknown) {
        // Fallback nếu có thay đổi role giữa chừng hoặc Discord từ chối
        isSuccess = false;
        logger.info(
          { err, userId, guildId, moduleKey: mod.moduleKey },
          'Landmine explosion failed due to member hierarchy or permissions',
        );
      }
    }

    // 3. Ghi nhận số liệu vào Database (Asynchronous, không chặn event loop)
    void this.recordStats(
      guildId,
      mod.moduleKey,
      userId,
      isSuccess,
      isSuccess ? durationSeconds : 0,
    );

    // 4. Tạo Embed thông báo phát nổ
    let title: string;
    if (mod.moduleKey === DefaultModuleKey.FOUNDATION) {
      title = t.FOUNDATION_TITLE;
    } else if (mod.moduleKey === DefaultModuleKey.ADVANCED) {
      title = t.ADVANCED_TITLE;
    } else {
      const customNum = mod.moduleKey.replace(/^m/i, '').toUpperCase();
      title = t.CUSTOM_TITLE.replace('{id}', customNum);
    }

    let description: string;
    if (isSuccess) {
      description = mod.successMessage
        ? formatExplosionMessage(mod.successMessage, userId)
        : formatExplosionMessage(t.DEFAULT_SUCCESS_MSG, userId);
    } else {
      description = mod.failedMessage
        ? formatExplosionMessage(mod.failedMessage, userId)
        : formatExplosionMessage(t.DEFAULT_FAILED_MSG, userId);
    }

    const durationDisplay = this.formatDurationSeconds(durationSeconds, lang);

    let footerText: string;
    if (mod.algorithmType === AlgorithmType.STATIC) {
      const ratePercent = (mod.staticRate * 100)
        .toFixed(2)
        .replace(/\.00$/, '');
      footerText = t.STATIC_FOOTER.replace('{rate}', ratePercent).replace(
        '{duration}',
        durationDisplay,
      );
    } else {
      footerText = t.DYNAMIC_FOOTER.replace(
        '{rm}',
        String(rollDetails.rm ?? 1),
      )
        .replace('{tier}', String(rollDetails.tier ?? 3))
        .replace(
          '{rate}',
          (rollDetails.baseRatePercent ?? 1.0).toFixed(1),
        )
        .replace('{pm}', String(rollDetails.pm ?? 1))
        .replace('{duration}', durationDisplay);
    }

    const embed = createBaseEmbed({
      title,
      description,
      color: isSuccess ? EmbedColor.ERROR : EmbedColor.WARNING,
    })
      .setImage(LandmineVisuals.EXPLOSION_GIF_URL)
      .setFooter({ text: footerText });

    try {
      let alertMsg: Message | null = null;
      try {
        alertMsg = await message.reply({ embeds: [embed] });
      } catch {
        // Fallback gửi thẳng vào channel nếu tin nhắn gốc vừa bị người dùng xóa
        if (
          'send' in message.channel &&
          typeof message.channel.send === 'function'
        ) {
          alertMsg = await message.channel.send({ embeds: [embed] });
        }
      }

      // 5. Tự động xóa tin nhắn sau 15 giây nếu có toggle autoDeleteNotification
      if (alertMsg && mod.autoDeleteNotification) {
        const targetMsg = alertMsg;
        const timer = setTimeout(() => {
          void targetMsg.delete().catch(() => null);
        }, LandmineLimits.AUTO_DELETE_DELAY_MS);
        timer.unref?.();
      }
    } catch (err: unknown) {
      logger.warn({ err, guildId }, 'Failed to send landmine explosion message');
    }
  }

  private async recordStats(
    guildId: string,
    moduleKey: string,
    userId: string,
    isSuccess: boolean,
    durationSec: number,
  ): Promise<void> {
    try {
      await db.landmineRecord.upsert({
        where: {
          guildId_moduleKey_userId: {
            guildId,
            moduleKey,
            userId,
          },
        },
        update: {
          totalSteps: { increment: 1 },
          ...(isSuccess
            ? {
                successCount: { increment: 1 },
                totalTimeoutSeconds: { increment: BigInt(durationSec) },
              }
            : {
                failedCount: { increment: 1 },
              }),
        },
        create: {
          guildId,
          moduleKey,
          userId,
          totalSteps: 1,
          successCount: isSuccess ? 1 : 0,
          failedCount: isSuccess ? 0 : 1,
          totalTimeoutSeconds: BigInt(isSuccess ? durationSec : 0),
        },
      });
    } catch (err: unknown) {
      // Xử lý race condition P2002 trên SQLite nếu 2 tin nhắn ghi đồng thời
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        err.code === 'P2002'
      ) {
        try {
          await db.landmineRecord.update({
            where: {
              guildId_moduleKey_userId: {
                guildId,
                moduleKey,
                userId,
              },
            },
            data: {
              totalSteps: { increment: 1 },
              ...(isSuccess
                ? {
                    successCount: { increment: 1 },
                    totalTimeoutSeconds: { increment: BigInt(durationSec) },
                  }
                : {
                    failedCount: { increment: 1 },
                  }),
            },
          });
          return;
        } catch {
          // Bỏ qua nếu vẫn xung đột
        }
      }
      logger.error(
        { err, guildId, moduleKey, userId },
        'Failed to record landmine stats',
      );
    }
  }

  // ==========================================
  // CRUD & MANAGEMENT METHODS
  // ==========================================

  public async getModules(guildId: string) {
    await this.ensureDefaultModules(guildId);
    const modules = await db.landmineModule.findMany({
      where: { guildId },
    });
    // Sắp xếp thứ tự M1, M2, M3..M10 chuẩn xác
    modules.sort(
      (a, b) => getModuleRank(a.moduleKey) - getModuleRank(b.moduleKey),
    );
    return modules;
  }

  public async createCustomModule(
    guildId: string,
    input: CreateModuleInput,
  ): Promise<string> {
    await this.ensureDefaultModules(guildId);

    const existingModules = await db.landmineModule.findMany({
      where: { guildId },
      select: { moduleKey: true },
    });

    const usedKeys = new Set(
      existingModules.map((m) => m.moduleKey.toLowerCase()),
    );

    // Module 1 và 2 là mặc định (Foundation & Advanced).
    // Custom modules được cấp phát từ M3 đến M10 (tổng cộng tối đa 10 module per-server).
    let chosenKey: string | null = null;
    for (let i = 3; i <= LandmineLimits.MAX_CUSTOM_MODULES; i++) {
      const candidate = `m${i}`;
      if (!usedKeys.has(candidate)) {
        chosenKey = candidate;
        break;
      }
    }

    if (!chosenKey) {
      throw new AppError(
        landmineLocale.vi.MAX_MODULES_REACHED,
        'MAX_MODULES_REACHED',
        true,
      );
    }

    if (
      input.ratePercent < LandmineLimits.MIN_RATE * 100 ||
      input.ratePercent > LandmineLimits.MAX_RATE * 100
    ) {
      throw new AppError(
        landmineLocale.vi.INVALID_RATE,
        'INVALID_RATE',
        true,
      );
    }

    if (
      input.durationSeconds < LandmineLimits.MIN_PUNISHMENT_SECONDS ||
      input.durationSeconds > LandmineLimits.MAX_PUNISHMENT_SECONDS
    ) {
      throw new AppError(
        landmineLocale.vi.INVALID_DURATION,
        'INVALID_DURATION',
        true,
      );
    }

    const staticRate = input.ratePercent / 100;

    await db.landmineModule.create({
      data: {
        guildId,
        moduleKey: chosenKey,
        isDefault: false,
        isEnabled: false,
        note: input.note ?? null,
        algorithmType: AlgorithmType.STATIC,
        staticRate,
        punishmentDurationSeconds: input.durationSeconds,
        channelScopeType: ScopeType.ALL,
        channelIds: '[]',
        roleScopeType: ScopeType.BLACKLIST,
        roleIds: '[]',
        includeInServerLeaderboard: true,
        autoDeleteNotification: false,
      },
    });

    await this.refreshGuildCache(guildId);
    return chosenKey.toUpperCase();
  }

  public async editModule(
    guildId: string,
    rawKey: string,
    input: EditModuleInput,
  ): Promise<string> {
    const moduleKey = normalizeModuleKey(rawKey);
    const existing = await db.landmineModule.findUnique({
      where: { guildId_moduleKey: { guildId, moduleKey } },
    });

    if (!existing) {
      throw new AppError(
        landmineLocale.vi.MODULE_NOT_FOUND,
        'MODULE_NOT_FOUND',
        true,
      );
    }

    if (existing.isDefault) {
      if (
        input.ratePercent !== undefined ||
        input.durationSeconds !== undefined
      ) {
        throw new AppError(
          landmineLocale.vi.CANNOT_EDIT_DEFAULT_ALGORITHM,
          'CANNOT_EDIT_DEFAULT_ALGORITHM',
          true,
        );
      }
    }

    if (input.ratePercent !== undefined) {
      if (
        input.ratePercent < LandmineLimits.MIN_RATE * 100 ||
        input.ratePercent > LandmineLimits.MAX_RATE * 100
      ) {
        throw new AppError(
          landmineLocale.vi.INVALID_RATE,
          'INVALID_RATE',
          true,
        );
      }
    }

    if (input.durationSeconds !== undefined) {
      if (
        input.durationSeconds < LandmineLimits.MIN_PUNISHMENT_SECONDS ||
        input.durationSeconds > LandmineLimits.MAX_PUNISHMENT_SECONDS
      ) {
        throw new AppError(
          landmineLocale.vi.INVALID_DURATION,
          'INVALID_DURATION',
          true,
        );
      }
    }

    const successMsg =
      input.successMessage === 'default' ||
      input.successMessage === 'none' ||
      input.successMessage === 'reset'
        ? null
        : input.successMessage;

    const failedMsg =
      input.failedMessage === 'default' ||
      input.failedMessage === 'none' ||
      input.failedMessage === 'reset'
        ? null
        : input.failedMessage;

    await db.landmineModule.update({
      where: { id: existing.id },
      data: {
        ...(input.note !== undefined && { note: input.note }),
        ...(input.ratePercent !== undefined && {
          staticRate: input.ratePercent / 100,
        }),
        ...(input.durationSeconds !== undefined && {
          punishmentDurationSeconds: input.durationSeconds,
        }),
        ...(input.channelScopeType !== undefined && {
          channelScopeType: input.channelScopeType,
        }),
        ...(input.roleScopeType !== undefined && {
          roleScopeType: input.roleScopeType,
        }),
        ...(input.includeInServerLeaderboard !== undefined && {
          includeInServerLeaderboard: input.includeInServerLeaderboard,
        }),
        ...(input.autoDeleteNotification !== undefined && {
          autoDeleteNotification: input.autoDeleteNotification,
        }),
        ...(input.successMessage !== undefined && {
          successMessage: successMsg,
        }),
        ...(input.failedMessage !== undefined && {
          failedMessage: failedMsg,
        }),
      },
    });

    await this.refreshGuildCache(guildId);
    return getModuleDisplayName(moduleKey);
  }

  public async deleteCustomModule(
    guildId: string,
    rawKey: string,
  ): Promise<string> {
    const moduleKey = normalizeModuleKey(rawKey);
    const existing = await db.landmineModule.findUnique({
      where: { guildId_moduleKey: { guildId, moduleKey } },
    });

    if (!existing) {
      throw new AppError(
        landmineLocale.vi.MODULE_NOT_FOUND,
        'MODULE_NOT_FOUND',
        true,
      );
    }

    if (existing.isDefault) {
      throw new AppError(
        landmineLocale.vi.CANNOT_DELETE_DEFAULT,
        'CANNOT_DELETE_DEFAULT',
        true,
      );
    }

    await db.landmineModule.delete({ where: { id: existing.id } });
    await this.refreshGuildCache(guildId);
    return getModuleDisplayName(moduleKey);
  }

  public async toggleModule(
    guildId: string,
    rawKey: string,
    state: boolean,
  ): Promise<string> {
    await this.ensureDefaultModules(guildId);
    const moduleKey = normalizeModuleKey(rawKey);
    const existing = await db.landmineModule.findUnique({
      where: { guildId_moduleKey: { guildId, moduleKey } },
    });

    if (!existing) {
      throw new AppError(
        landmineLocale.vi.MODULE_NOT_FOUND,
        'MODULE_NOT_FOUND',
        true,
      );
    }

    await db.landmineModule.update({
      where: { id: existing.id },
      data: { isEnabled: state },
    });

    await this.refreshGuildCache(guildId);
    return getModuleDisplayName(moduleKey);
  }

  public async setChannels(
    guildId: string,
    rawKey: string,
    mode: ScopeType,
    channelIds?: string[],
  ): Promise<{ moduleKey: string; mode: ScopeType; count: number }> {
    await this.ensureDefaultModules(guildId);
    const moduleKey = normalizeModuleKey(rawKey);
    const existing = await db.landmineModule.findUnique({
      where: { guildId_moduleKey: { guildId, moduleKey } },
    });

    if (!existing) {
      throw new AppError(
        landmineLocale.vi.MODULE_NOT_FOUND,
        'MODULE_NOT_FOUND',
        true,
      );
    }

    let finalChannels: string[];
    if (mode === ScopeType.ALL) {
      finalChannels = [];
    } else if (channelIds !== undefined) {
      finalChannels = channelIds;
    } else {
      finalChannels = this.parseJsonArray(existing.channelIds);
    }

    await db.landmineModule.update({
      where: { id: existing.id },
      data: {
        channelScopeType: mode,
        channelIds: JSON.stringify(finalChannels),
      },
    });

    await this.refreshGuildCache(guildId);
    return {
      moduleKey: getModuleDisplayName(moduleKey),
      mode,
      count: finalChannels.length,
    };
  }

  public async setRoles(
    guildId: string,
    rawKey: string,
    mode: ScopeType,
    roleIds?: string[],
  ): Promise<{ moduleKey: string; mode: ScopeType; count: number }> {
    await this.ensureDefaultModules(guildId);
    const moduleKey = normalizeModuleKey(rawKey);
    const existing = await db.landmineModule.findUnique({
      where: { guildId_moduleKey: { guildId, moduleKey } },
    });

    if (!existing) {
      throw new AppError(
        landmineLocale.vi.MODULE_NOT_FOUND,
        'MODULE_NOT_FOUND',
        true,
      );
    }

    let finalRoles: string[];
    if (mode === ScopeType.ALL) {
      finalRoles = [];
    } else if (roleIds !== undefined) {
      finalRoles = roleIds;
    } else {
      finalRoles = this.parseJsonArray(existing.roleIds);
    }

    await db.landmineModule.update({
      where: { id: existing.id },
      data: {
        roleScopeType: mode,
        roleIds: JSON.stringify(finalRoles),
      },
    });

    await this.refreshGuildCache(guildId);
    return {
      moduleKey: getModuleDisplayName(moduleKey),
      mode,
      count: finalRoles.length,
    };
  }

  public async setGuildLocale(
    guildId: string,
    locale: 'vi' | 'en' | 'auto',
  ): Promise<string> {
    const forcedLocale = locale === 'auto' ? null : locale;
    await db.landmineGuildConfig.upsert({
      where: { guildId },
      update: { forcedLocale },
      create: { guildId, forcedLocale },
    });

    this.guildLocaleCache.set(guildId, forcedLocale);
    return locale.toUpperCase();
  }

  public async resetStats(guildId: string, rawKey: string): Promise<string> {
    const key = rawKey.toLowerCase();
    if (key === 'all') {
      await db.landmineRecord.deleteMany({ where: { guildId } });
      return 'ALL';
    }

    const normalized = normalizeModuleKey(rawKey);
    await db.landmineRecord.deleteMany({
      where: { guildId, moduleKey: normalized },
    });
    return getModuleDisplayName(normalized);
  }

  public async getLeaderboard(
    guildId: string,
    rawScope: string = 'server',
    sortBy: LeaderboardSortType = LeaderboardSortType.COUNT,
    limit: number = 10,
  ): Promise<LeaderboardResult> {
    const scope = rawScope.toLowerCase();

    if (scope === 'server' || scope === 'all') {
      // Tổng hợp từ các module có bật includeInServerLeaderboard
      const eligibleModules = await db.landmineModule.findMany({
        where: { guildId, includeInServerLeaderboard: true },
        select: { moduleKey: true },
      });

      const eligibleKeys = eligibleModules.map((m) => m.moduleKey);
      if (eligibleKeys.length === 0) {
        return { scope: 'server', sortBy, entries: [] };
      }

      const records = await db.landmineRecord.findMany({
        where: {
          guildId,
          moduleKey: { in: eligibleKeys },
        },
      });

      // Gộp số liệu theo userId
      const userMap = new Map<
        string,
        {
          totalSteps: number;
          successCount: number;
          failedCount: number;
          totalTimeoutSeconds: number;
        }
      >();

      for (const r of records) {
        const cur = userMap.get(r.userId) ?? {
          totalSteps: 0,
          successCount: 0,
          failedCount: 0,
          totalTimeoutSeconds: 0,
        };
        cur.totalSteps += r.totalSteps;
        cur.successCount += r.successCount;
        cur.failedCount += r.failedCount;
        cur.totalTimeoutSeconds += Number(r.totalTimeoutSeconds);
        userMap.set(r.userId, cur);
      }

      const entries: LeaderboardEntry[] = Array.from(userMap.entries()).map(
        ([userId, data]) => ({
          userId,
          ...data,
        }),
      );

      // Sắp xếp
      if (sortBy === LeaderboardSortType.DURATION) {
        entries.sort((a, b) => {
          if (b.totalTimeoutSeconds !== a.totalTimeoutSeconds) {
            return b.totalTimeoutSeconds - a.totalTimeoutSeconds;
          }
          return b.totalSteps - a.totalSteps;
        });
      } else {
        entries.sort((a, b) => {
          if (b.totalSteps !== a.totalSteps) {
            return b.totalSteps - a.totalSteps;
          }
          return b.totalTimeoutSeconds - a.totalTimeoutSeconds;
        });
      }

      return {
        scope: 'server',
        sortBy,
        entries: entries.slice(0, limit),
      };
    }

    // BXH theo module cụ thể
    const normalizedKey = normalizeModuleKey(rawScope);
    const records = await db.landmineRecord.findMany({
      where: { guildId, moduleKey: normalizedKey },
    });

    const entries: LeaderboardEntry[] = records.map((r) => ({
      userId: r.userId,
      totalSteps: r.totalSteps,
      successCount: r.successCount,
      failedCount: r.failedCount,
      totalTimeoutSeconds: Number(r.totalTimeoutSeconds),
    }));

    if (sortBy === LeaderboardSortType.DURATION) {
      entries.sort((a, b) => {
        if (b.totalTimeoutSeconds !== a.totalTimeoutSeconds) {
          return b.totalTimeoutSeconds - a.totalTimeoutSeconds;
        }
        return b.totalSteps - a.totalSteps;
      });
    } else {
      entries.sort((a, b) => {
        if (b.totalSteps !== a.totalSteps) {
          return b.totalSteps - a.totalSteps;
        }
        return b.totalTimeoutSeconds - a.totalTimeoutSeconds;
      });
    }

    return {
      scope: getModuleDisplayName(normalizedKey),
      sortBy,
      entries: entries.slice(0, limit),
    };
  }
}

export const landmineService = new LandmineService();
