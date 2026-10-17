import { EventEmitter } from 'node:events';
import { logger } from './logger.js';

export type AsyncEventListener = (payload?: unknown) => Promise<void> | void;

export class AsyncEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

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
}

export const eventBus = new AsyncEventBus();
