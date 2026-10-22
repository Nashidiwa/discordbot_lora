import { Events, type Guild } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const event: BotEvent<Events.GuildDelete> = {
  name: Events.GuildDelete,
  execute: async (guild: Guild): Promise<void> => {
    // DEC-006: Do NOT treat Discord gateway outages (guild.available === false) as true departures
    if (guild.available === false) {
      logger.warn(
        { guildId: guild.id, name: guild.name },
        'Word Chain: Guild unavailable due to Discord outage/reconnect. Skipping leftAt departure mark.',
      );
      return;
    }

    try {
      const config = await wordChainGameService.getConfig(guild.id);
      if (config) {
        // Record departure timestamp for 7-day retention grace period
        await wordChainGameService.updateConfig(guild.id, { leftAt: new Date() });
        logger.info(
          { guildId: guild.id, name: guild.name },
          'Word Chain: Guild departure confirmed. Marked leftAt for 7-day retention grace period.',
        );
      }
    } catch (err: unknown) {
      logger.error({ err, guildId: guild.id }, 'Word Chain: Error on GuildDelete lifecycle handler');
    }
  },
};

export default event;
