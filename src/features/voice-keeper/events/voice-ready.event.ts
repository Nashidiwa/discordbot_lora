import { type Client, Events } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';

export const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client: Client<true>) => {
    await voiceKeeperService.initAllActiveConnections(client);
  },
};

export default event;
