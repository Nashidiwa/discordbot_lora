import { type Client, Events, type TextChannel, EmbedBuilder } from 'discord.js';
import type { ExtendedClient } from '../../../core/client.js';
import type { BotEvent } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { GameMode } from '../types/wordchain.types.js';

export const event: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute: async (client: Client<true>): Promise<void> => {
    try {
      const configs = await db.wordChainConfig.findMany({
        where: {
          isBanned: false,
          leftAt: null,
          OR: [
            { normalModeChannelId: { not: null } },
            { hardModeChannelId: { not: null } },
          ],
        },
      });

      logger.info({ count: configs.length }, 'Word Chain: Running boot rejoin inspection across active guilds');

      for (const config of configs) {
        const guild = client.guilds.cache.get(config.guildId);
        if (!guild) continue;

        // Inspect Normal Mode Channel
        if (config.normalModeChannelId && config.currentWordNormal) {
          const channel = guild.channels.cache.get(config.normalModeChannelId) as TextChannel | undefined;
          if (channel?.isTextBased()) {
            try {
              const lastMessages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
              const lastMsg = lastMessages?.first();

              // Suppression Invariant: If last message in channel matches currentWord & lastMemberId, suppress greeting!
              const isMatch =
                lastMsg &&
                lastMsg.content.toLowerCase().trim() === config.currentWordNormal &&
                lastMsg.author.id === config.lastMemberIdNormal;

              if (!isMatch) {
                // Channel state is discrepant: prompt channel with recovery token
                const requiredToken = config.currentWordNormal.slice(-GameMode.NORMAL);
                const recoveryEmbed = new EmbedBuilder()
                  .setColor(EmbedColor.WARNING)
                  .setTitle('Word Chain: Active Game Restored')
                  .setDescription(
                    `Game is ready! Continue the chain with a word starting with **${requiredToken}**.\n` +
                      `Current chain count: **${config.currentCountNormal}** | High score: **${config.highScoreNormal}**.`,
                  );
                await channel.send({ embeds: [recoveryEmbed] }).catch(() => {});
              }
            } catch {
              // Ignore channel fetch errors
            }
          }
        }

        // Inspect Hard Mode Channel
        if (config.hardModeChannelId && config.currentWordHard) {
          const channel = guild.channels.cache.get(config.hardModeChannelId) as TextChannel | undefined;
          if (channel?.isTextBased()) {
            try {
              const lastMessages = await channel.messages.fetch({ limit: 1 }).catch(() => null);
              const lastMsg = lastMessages?.first();

              const isMatch =
                lastMsg &&
                lastMsg.content.toLowerCase().trim() === config.currentWordHard &&
                lastMsg.author.id === config.lastMemberIdHard;

              if (!isMatch) {
                const requiredToken = config.currentWordHard.slice(-GameMode.HARD);
                const recoveryEmbed = new EmbedBuilder()
                  .setColor(EmbedColor.WARNING)
                  .setTitle('Word Chain (Hard Mode): Active Game Restored')
                  .setDescription(
                    `Hard Mode is ready! Continue the chain with a word starting with **${requiredToken}**.\n` +
                      `Current chain count: **${config.currentCountHard}** | High score: **${config.highScoreHard}**.`,
                  );
                await channel.send({ embeds: [recoveryEmbed] }).catch(() => {});
              }
            } catch {
              // Ignore channel fetch errors
            }
          }
        }
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Word Chain: Error during ClientReady boot rejoin');
    }
  },
};

export default event;
