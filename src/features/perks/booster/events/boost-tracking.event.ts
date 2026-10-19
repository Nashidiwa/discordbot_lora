import { Events, type Message, MessageType } from 'discord.js';
import type { BotEvent } from '../../../../core/types/index.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  once: false,
  execute: async (message: Message): Promise<void> => {
    if (!message.guildId || !message.system) {
      return;
    }

    const boostMessageTypes = [
      MessageType.GuildBoost,
      MessageType.GuildBoostTier1,
      MessageType.GuildBoostTier2,
      MessageType.GuildBoostTier3,
    ];

    if (boostMessageTypes.includes(message.type)) {
      await boosterPerkService.incrementBoostCount(
        message.guildId,
        message.author.id,
      );
    }
  },
};

export default event;
