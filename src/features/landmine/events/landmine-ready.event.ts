import { type Client, Events } from 'discord.js';
import { logger } from '../../../core/logger.js';
import type { BotEvent } from '../../../core/types/index.js';
import { landmineService } from '../services/landmine.service.js';

export const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client: Client<true>): Promise<void> => {
    try {
      await landmineService.initCache(client);
    } catch (err: unknown) {
      logger.error(
        { err },
        'Failed to initialize Landmine service in ready event',
      );
    }
  },
};

export default event;
