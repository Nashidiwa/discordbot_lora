import { Events, type Message, type PartialMessage, type TextChannel } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const event: BotEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,
  execute: async (message: Message | PartialMessage): Promise<void> => {
    // Fast filters
    if (!message.author || message.author.bot || !message.guildId || !message.guild) {
      return;
    }

    const config = await wordChainGameService.getConfig(message.guildId);
    if (!config) {
      return;
    }

    let currentWord: string | null = null;
    if (config.normalModeChannelId && message.channelId === config.normalModeChannelId) {
      currentWord = config.currentWordNormal;
    } else if (config.hardModeChannelId && message.channelId === config.hardModeChannelId) {
      currentWord = config.currentWordHard;
    }

    if (!currentWord) {
      return;
    }

    // Verify message was in game channel and reacted to by bot
    const hasReactions = (message.reactions?.cache?.size ?? 0) > 0;
    if (hasReactions) {
      const channel = message.channel as TextChannel;
      await channel
        .send(
          `<@${message.author.id}> deleted their word! The **last** word was **${currentWord}**.`,
        )
        .catch((err: unknown) => {
          logger.warn({ err, guildId: message.guildId, channelId: message.channelId }, '[Wordchain] Failed to send word deletion notice');
        });
    }
  },
};

export default event;
