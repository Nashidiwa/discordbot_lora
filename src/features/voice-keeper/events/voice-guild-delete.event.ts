import { Events, type Guild } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';

export const event: BotEvent<Events.GuildDelete> = {
  name: Events.GuildDelete,
  execute: async (guild: Guild): Promise<void> => {
    // Không xử lý khi Discord gặp sự cố gateway outage (guild.available === false)
    if (guild.available === false) {
      return;
    }

    try {
      await voiceKeeperService.disconnect(guild.id);
      logger.info(
        { guildId: guild.id, name: guild.name },
        'Voice Keeper: Cleaned up voice session upon guild departure/kick',
      );
    } catch (err: unknown) {
      logger.error(
        { err, guildId: guild.id },
        'Voice Keeper: Error disconnecting voice on GuildDelete',
      );
    }
  },
};

export default event;
