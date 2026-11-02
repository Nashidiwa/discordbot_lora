import { Events, type Message } from 'discord.js';
import { logger } from '../../../core/logger.js';
import type { BotEvent } from '../../../core/types/index.js';
import { landmineService } from '../services/landmine.service.js';

export const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  once: false,
  execute: async (message: Message): Promise<void> => {
    // 1. Lọc biên nhanh chóng: bỏ qua bot, webhook, system messages hoặc DM
    if (
      !message.guild ||
      !message.guildId ||
      message.author.bot ||
      Boolean(message.webhookId) ||
      message.system
    ) {
      return;
    }

    // 2. Bọc an toàn tuyệt đối tránh unhandled rejection làm gián đoạn bot
    try {
      await landmineService.evaluateMessage(message);
    } catch (err: unknown) {
      logger.error(
        {
          err,
          guildId: message.guildId,
          channelId: message.channelId,
          messageId: message.id,
          userId: message.author.id,
        },
        'Unhandled exception while evaluating landmine in messageCreate event',
      );
    }
  },
};

export default event;
