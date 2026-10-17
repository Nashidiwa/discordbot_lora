import { type Client, Events } from 'discord.js';
import type { ExtendedClient } from '../client.js';
import { logger } from '../logger.js';
import type { BotEvent } from '../types/index.js';

export const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client: Client<true>) => {
    const extendedClient = client as ExtendedClient;
    logger.info(
      {
        tag: client.user.tag,
        id: client.user.id,
        guilds: client.guilds.cache.size,
        commands: extendedClient.commands.size,
      },
      'Discord Bot is online and ready!',
    );
  },
};

export default event;
