import type { FastifyReply, FastifyRequest } from 'fastify';
import { eventBus } from '../../bus.js';
import { logger } from '../../logger.js';

export interface SSEClient {
  id: string;
  guildId?: string;
  reply: FastifyReply;
  heartbeatTimer: NodeJS.Timeout;
}

interface SystemSSEClient {
  id: string;
  reply: FastifyReply;
  timer: NodeJS.Timeout;
}

function safeJsonStringify(data: unknown): string {
  try {
    return JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    );
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to stringify SSE payload');
    return '{}';
  }
}

export class SSEManager {
  private static clients = new Map<string, SSEClient>();
  private static systemClients = new Map<string, SystemSSEClient>();
  private static isInitialized = false;

  private static voiceStatusListener = (payload?: unknown) => {
    const data = payload as { guildId?: string; status?: string } | undefined;
    if (data?.guildId) {
      SSEManager.broadcastToGuild(data.guildId, 'voice:status', data);
    }
  };

  private static permitChangedListener = (payload?: unknown) => {
    const data = payload as { guildId?: string } | undefined;
    if (data?.guildId) {
      SSEManager.broadcastToGuild(data.guildId, 'permit:changed', data);
    }
  };

  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Lắng nghe sự kiện từ EventBus để push xuống SSE clients
    eventBus.on('voice:status', this.voiceStatusListener);
    eventBus.on('permit:changed', this.permitChangedListener);

    logger.debug('SSEManager initialized with EventBus subscriptions');
  }

  /**
   * Đăng ký một kết nối SSE mới cho Guild
   */
  public static registerGuildClient(
    guildId: string,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    this.initialize();

    const clientId = `${guildId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    try {
      reply.raw.write(
        `event: connected\ndata: ${safeJsonStringify({ guildId, timestamp: Date.now() })}\n\n`,
      );
    } catch {
      // Connection already aborted
      return;
    }

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      clearInterval(heartbeatTimer);
      this.clients.delete(clientId);

      if (!reply.raw.writableEnded && !reply.raw.destroyed) {
        try {
          reply.raw.end();
        } catch {
          // ignore
        }
      }
    };

    const heartbeatTimer = setInterval(() => {
      if (reply.raw.writableEnded || reply.raw.destroyed) {
        cleanup();
        return;
      }
      try {
        reply.raw.write(':keep-alive\n\n');
      } catch {
        cleanup();
      }
    }, 15000);

    const client: SSEClient = {
      id: clientId,
      guildId,
      reply,
      heartbeatTimer,
    };

    this.clients.set(clientId, client);

    request.raw.on('close', cleanup);
    reply.raw.on('close', cleanup);
    request.raw.on('error', cleanup);
    reply.raw.on('error', cleanup);
  }

  /**
   * Broadcast dữ liệu sự kiện tới tất cả SSE clients trong một Guild
   */
  public static broadcastToGuild(
    guildId: string,
    event: string,
    data: unknown,
  ): void {
    const payloadStr = safeJsonStringify(data);
    const message = `event: ${event}\ndata: ${payloadStr}\n\n`;

    for (const [clientId, client] of this.clients.entries()) {
      if (client.guildId === guildId) {
        if (client.reply.raw.writableEnded || client.reply.raw.destroyed) {
          clearInterval(client.heartbeatTimer);
          this.clients.delete(clientId);
          continue;
        }

        try {
          client.reply.raw.write(message);
        } catch {
          clearInterval(client.heartbeatTimer);
          this.clients.delete(clientId);
        }
      }
    }
  }

  /**
   * Đăng ký một kết nối SSE theo dõi System Metrics cho Bot Owner
   */
  public static registerSystemMetricsClient(
    request: FastifyRequest,
    reply: FastifyReply,
    getMetrics: () => Record<string, unknown>,
  ): void {
    const clientId = `system_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    try {
      reply.raw.write(
        `event: connected\ndata: ${safeJsonStringify({ status: 'connected' })}\n\n`,
      );
    } catch {
      return;
    }

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      clearInterval(intervalTimer);
      this.systemClients.delete(clientId);

      if (!reply.raw.writableEnded && !reply.raw.destroyed) {
        try {
          reply.raw.end();
        } catch {
          // ignore
        }
      }
    };

    const intervalTimer = setInterval(() => {
      if (reply.raw.writableEnded || reply.raw.destroyed) {
        cleanup();
        return;
      }

      try {
        const metrics = getMetrics();
        reply.raw.write(`event: metrics\ndata: ${safeJsonStringify(metrics)}\n\n`);
      } catch {
        cleanup();
      }
    }, 3000);

    this.systemClients.set(clientId, { id: clientId, reply, timer: intervalTimer });

    request.raw.on('close', cleanup);
    reply.raw.on('close', cleanup);
    request.raw.on('error', cleanup);
    reply.raw.on('error', cleanup);
  }

  /**
   * Đóng toàn bộ kết nối SSE và giải phóng tài nguyên bộ nhớ khi shutdown server
   */
  public static shutdown(): void {
    // 1. Dọn dẹp Guild clients
    for (const [clientId, client] of this.clients.entries()) {
      clearInterval(client.heartbeatTimer);
      if (!client.reply.raw.writableEnded && !client.reply.raw.destroyed) {
        try {
          client.reply.raw.end();
        } catch {
          // ignore
        }
      }
      this.clients.delete(clientId);
    }

    // 2. Dọn dẹp System Metrics clients
    for (const [clientId, client] of this.systemClients.entries()) {
      clearInterval(client.timer);
      if (!client.reply.raw.writableEnded && !client.reply.raw.destroyed) {
        try {
          client.reply.raw.end();
        } catch {
          // ignore
        }
      }
      this.systemClients.delete(clientId);
    }

    // 3. Hủy đăng ký EventBus listeners
    if (this.isInitialized) {
      eventBus.off('voice:status', this.voiceStatusListener);
      eventBus.off('permit:changed', this.permitChangedListener);
      this.isInitialized = false;
    }

    logger.info('SSEManager closed all connections and timers successfully');
  }
}
