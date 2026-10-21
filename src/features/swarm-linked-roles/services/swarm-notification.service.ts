import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type GuildTextBasedChannel,
} from 'discord.js';
import { logger } from '../../../core/logger.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { swarmLocale } from '../swarm.locale.js';
import { SwarmAuthService } from './swarm-auth.service.js';

export class SwarmNotificationService {
  /**
   * Set or update notification channel for a guild
   */
  public static async setGuildChannel(
    guildId: string,
    channelId: string,
  ): Promise<void> {
    await db.swarmGuildConfig.upsert({
      where: { guildId },
      update: { notificationChannelId: channelId },
      create: {
        guildId,
        notificationChannelId: channelId,
      },
    });

    logger.info({ guildId, channelId }, 'Configured Swarm notification channel');
  }

  /**
   * Remove notification channel for a guild
   */
  public static async removeGuildChannel(guildId: string): Promise<void> {
    await db.swarmGuildConfig
      .delete({
        where: { guildId },
      })
      .catch(() => undefined);

    logger.info({ guildId }, 'Removed Swarm notification channel');
  }

  /**
   * Send upgrade / promotion announcement to guild channel
   */
  public static async sendUpgradeAnnouncement(
    client: Client,
    guildId: string,
    targetUserId: string,
    level: number,
    roleName: string,
  ): Promise<void> {
    try {
      const config = await db.swarmGuildConfig.findUnique({
        where: { guildId },
      });

      if (!config?.notificationChannelId) {
        return;
      }

      const channel = await client.channels
        .fetch(config.notificationChannelId)
        .catch(() => null);

      if (!channel || !channel.isTextBased()) {
        logger.warn(
          { guildId, channelId: config.notificationChannelId },
          'Notification channel not found or not text-based',
        );
        return;
      }

      const textChannel = channel as GuildTextBasedChannel;
      const locale = await getUserLocale({ guildId });

      const title = t(swarmLocale, 'ANNOUNCE_UPGRADE_TITLE', locale);
      const descTemplate = t(swarmLocale, 'ANNOUNCE_UPGRADE_DESC', locale);
      const description = descTemplate
        .replace('{user}', `<@${targetUserId}>`)
        .replaceAll('{roleName}', roleName)
        .replace('{level}', String(level));

      const embed = createBaseEmbed({
        title,
        description,
        color: EmbedColor.SUCCESS,
      });

      const authUrl = SwarmAuthService.getAuthorizationUrl(
        targetUserId,
        guildId,
      );
      const button = new ButtonBuilder()
        .setLabel(
          locale === 'vi' ? '🔗 Kích Hoạt Role' : '🔗 Receive Role',
        )
        .setStyle(ButtonStyle.Link)
        .setURL(authUrl);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await textChannel.send({
        embeds: [embed],
        components: [row],
      });

      logger.info(
        { guildId, targetUserId, level },
        'Dispatched Swarm upgrade announcement',
      );
    } catch (error) {
      logger.error(
        { error, guildId, targetUserId },
        'Failed to dispatch Swarm upgrade announcement',
      );
    }
  }

  /**
   * Send revocation announcement to guild channel
   */
  public static async sendRevocationAnnouncement(
    client: Client,
    guildId: string,
    targetUserId: string,
  ): Promise<void> {
    try {
      const config = await db.swarmGuildConfig.findUnique({
        where: { guildId },
      });

      if (!config?.notificationChannelId) {
        return;
      }

      const channel = await client.channels
        .fetch(config.notificationChannelId)
        .catch(() => null);

      if (!channel || !channel.isTextBased()) {
        logger.warn(
          { guildId, channelId: config.notificationChannelId },
          'Notification channel not found or not text-based',
        );
        return;
      }

      const textChannel = channel as GuildTextBasedChannel;
      const locale = await getUserLocale({ guildId });

      const title = t(swarmLocale, 'ANNOUNCE_REVOKE_TITLE', locale);
      const descTemplate = t(swarmLocale, 'ANNOUNCE_REVOKE_DESC', locale);
      const description = descTemplate.replace('{user}', `<@${targetUserId}>`);

      const embed = createBaseEmbed({
        title,
        description,
        color: EmbedColor.ERROR,
      });

      await textChannel.send({
        embeds: [embed],
      });

      logger.info(
        { guildId, targetUserId },
        'Dispatched Swarm revocation announcement',
      );
    } catch (error) {
      logger.error(
        { error, guildId, targetUserId },
        'Failed to dispatch Swarm revocation announcement',
      );
    }
  }
}
