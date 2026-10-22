import { Events, type Message, type PartialMessage, type TextChannel } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const event: BotEvent<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  execute: async (before: Message | PartialMessage, after: Message | PartialMessage): Promise<void> => {
    // Fast filters
    if (!after.author || after.author.bot || !after.guildId || !after.guild) {
      return;
    }

    // Ignore case-only edits or embed edits
    if (before.content?.toLowerCase() === after.content?.toLowerCase()) {
      return;
    }

    const config = await wordChainGameService.getConfig(after.guildId);
    if (!config) {
      return;
    }

    let currentWord: string | null = null;
    if (config.normalModeChannelId && after.channelId === config.normalModeChannelId) {
      currentWord = config.currentWordNormal;
    } else if (config.hardModeChannelId && after.channelId === config.hardModeChannelId) {
      currentWord = config.currentWordHard;
    }

    if (!currentWord) {
      return;
    }

    // Verify message was in game channel and reacted to by bot
    const hasReactions = (after.reactions?.cache?.size ?? 0) > 0 || (before.reactions?.cache?.size ?? 0) > 0;
    if (hasReactions) {
      const channel = after.channel as TextChannel;
      await channel
        .send(
          `<@${after.author.id}> edited their word! The **last** word was **${currentWord}**.`,
        )
        .catch(() => {});
    }
  },
};

export default event;
