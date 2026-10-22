import { Events, type Guild } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const event: BotEvent<Events.GuildCreate> = {
  name: Events.GuildCreate,
  execute: async (guild: Guild): Promise<void> => {
    try {
      const config = await wordChainGameService.getConfig(guild.id);
      if (config && config.leftAt !== null) {
        // Rejoin within 7-day grace period: clear departure timestamp and restore data (DEC-006)
        await wordChainGameService.updateConfig(guild.id, { leftAt: null });
        logger.info(
          { guildId: guild.id, name: guild.name },
          'Word Chain: Guild rejoined within 7-day grace period. Restored configuration.',
        );
      }
    } catch (err: unknown) {
      logger.error({ err, guildId: guild.id }, 'Word Chain: Error on GuildCreate lifecycle handler');
    }
  },
};

export default event;
