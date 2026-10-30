import { EventEmitter } from 'node:events';
import { logger } from './logger.js';

export interface EventBusMap {
  'voice:status': {
    guildId: string;
    channelId?: string | null;
    status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'IDLE';
    latencyMs?: number;
    error?: string;
  };
  'permit:changed': {
    guildId: string;
  };
  [key: string]: unknown;
}

export type AsyncEventListener<T = unknown> = (payload: T) => Promise<void> | void;

export class AsyncEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Phát sự kiện bất đồng bộ an toàn: bọc Promise.allSettled và cô lập lỗi giữa các listener
   */
  public async emitAsync<K extends keyof EventBusMap>(
    event: K,
    payload?: EventBusMap[K],
  ): Promise<void>;
  public async emitAsync(event: string, payload?: unknown): Promise<void> {
    const listeners = this.rawListeners(event);
    if (listeners.length === 0) {
      return;
    }

    const executions = listeners.map(async (rawListener) => {
      const listener = rawListener as AsyncEventListener;
      await listener(payload);
    });

    const results = await Promise.allSettled(executions);

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error(
          { err: result.reason, event },
          'Error executing async event listener',
        );
      }
    }
  }

  /**
   * Override emit đồng bộ mặc định của EventEmitter để tự động ủy quyền sang emitAsync an toàn,
   * ngăn chặn unhandled rejection khi các tính năng gọi .emit() với handler bất đồng bộ.
   */
  public override emit(event: string | symbol, ...args: unknown[]): boolean {
    if (typeof event === 'string') {
      void this.emitAsync(event, args[0]);
      return true;
    }
    return super.emit(event, ...args);
  }
}

export const eventBus = new AsyncEventBus();
