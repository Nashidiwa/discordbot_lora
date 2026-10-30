import { Events, type Message, type TextChannel } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { GameMode } from '../types/wordchain.types.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const event: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  execute: async (message: Message): Promise<void> => {
    // Fast filters: Ignore bots, webhooks, system messages, and direct messages
    if (message.author.bot || message.webhookId || !message.guildId || !message.guild) {
      return;
    }

    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    // Check if guild has active configuration
    const config = await wordChainGameService.getConfig(message.guildId);
    if (!config || config.isBanned) {
      return;
    }

    // Determine if the message was sent in an active game channel
    let mode: GameMode | null = null;
    if (config.normalModeChannelId && message.channelId === config.normalModeChannelId) {
      mode = GameMode.NORMAL;
    } else if (config.hardModeChannelId && message.channelId === config.hardModeChannelId) {
      mode = GameMode.HARD;
    }

    if (!mode) {
      return;
    }

    // Delegate turn processing to the game engine orchestrator
    const result = await wordChainGameService.processTurn({
      guildId: message.guildId,
      channelId: message.channelId,
      authorId: message.author.id,
      rawWord: message.content,
      gameMode: mode,
    });

    if (result.isIgnored) {
      return;
    }

    // 1. Add reaction emoji to the submitted message
    if (result.reactionEmoji) {
      await message.react(result.reactionEmoji).catch((err: unknown) => {
        logger.debug({ err, messageId: message.id }, '[Wordchain] Failed to react to message');
      });
    }

    // 2. Send text callout / notification if triggered (mistake embed, milestone, warning)
    if (result.message) {
      await (message.channel as TextChannel).send(result.message).catch((err: unknown) => {
        logger.warn({ err, channelId: message.channelId }, '[Wordchain] Failed to send game message');
      });
    }

    // 3. Reconcile Discord roles if role state transitioned
    if (result.roleStateChanged) {
      const { reliableRoleGranted, reliableRoleRevoked, failedRoleGranted, failedRoleCleared } =
        result.roleStateChanged;

      // Reliable Role transitions
      if (config.reliableRoleId) {
        const reliableRole = message.guild.roles.cache.get(config.reliableRoleId);
        if (reliableRole) {
          const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
          if (member) {
            if (reliableRoleGranted && !member.roles.cache.has(reliableRole.id)) {
              await member.roles.add(reliableRole).catch((err: unknown) => {
                logger.warn({ err, memberId: member.id, roleId: reliableRole.id }, '[Wordchain] Failed to grant reliable role');
              });
            } else if (reliableRoleRevoked && member.roles.cache.has(reliableRole.id)) {
              await member.roles.remove(reliableRole).catch((err: unknown) => {
                logger.warn({ err, memberId: member.id, roleId: reliableRole.id }, '[Wordchain] Failed to revoke reliable role');
              });
            }
          }
        }
      }

      // Failed Role transitions
      if (config.failedRoleId) {
        const failedRole = message.guild.roles.cache.get(config.failedRoleId);
        if (failedRole) {
          const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
          if (failedRoleGranted && member) {
            // Strip failed role from previous holder if different
            if (config.failedMemberId && config.failedMemberId !== message.author.id) {
              const prevMember = await message.guild.members.fetch(config.failedMemberId).catch(() => null);
              if (prevMember && prevMember.roles.cache.has(failedRole.id)) {
                await prevMember.roles.remove(failedRole).catch((err: unknown) => {
                  logger.warn({ err, memberId: prevMember.id, roleId: failedRole.id }, '[Wordchain] Failed to strip failed role from previous holder');
                });
              }
            }
            if (!member.roles.cache.has(failedRole.id)) {
              await member.roles.add(failedRole).catch((err: unknown) => {
                logger.warn({ err, memberId: member.id, roleId: failedRole.id }, '[Wordchain] Failed to grant failed role');
              });
            }
          } else if (failedRoleCleared && member) {
            if (member.roles.cache.has(failedRole.id)) {
              await member.roles.remove(failedRole).catch((err: unknown) => {
                logger.warn({ err, memberId: member.id, roleId: failedRole.id }, '[Wordchain] Failed to remove failed role');
              });
            }
          }
        }
      }
    }
  },
};

export default event;
