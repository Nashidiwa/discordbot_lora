import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  Team,
  User,
} from 'discord.js';
import { config } from '../../../core/config.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';
import { tWordChain } from '../wordchain.locale.js';

/**
 * Validates whether the executing user is a bot owner, team member, or operating inside DEV_GUILD_ID.
 */
async function isBotOwnerOrDevAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  // 1. Executing inside developer guild with Administrator permission
  if (
    config.DEV_GUILD_ID &&
    interaction.guildId === config.DEV_GUILD_ID &&
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  // 2. Application Owner / Team member check
  try {
    if (interaction.client.application && !interaction.client.application.owner) {
      await interaction.client.application.fetch().catch(() => null);
    }
    const owner = interaction.client.application?.owner;
    if (owner) {
      if (owner instanceof User && owner.id === interaction.user.id) {
        return true;
      }
      if (
        owner instanceof Team &&
        (owner.ownerId === interaction.user.id || owner.members.has(interaction.user.id))
      ) {
        return true;
      }
    }
  } catch {
    // Application fetch failure fallback
  }

  return false;
}

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId: interaction.guildId,
  });

  const action = interaction.options.getSubcommand();
  const isGlobalOrCrossGuildAction =
    action === 'purge-user' || action === 'ban-member' || action === 'ban-server';

  const targetGuildId = interaction.options.getString('guild_id');
  const isTargetingDifferentGuild =
    action === 'purge-server' && targetGuildId !== null && targetGuildId !== interaction.guildId;

  // Strict Authorization Guard (DEC-004 / Security Boundary)
  // Global operations and cross-guild operations require Bot Owner / Operator authorization
  if (isGlobalOrCrossGuildAction || isTargetingDifferentGuild) {
    const isAuthorized = await isBotOwnerOrDevAdmin(interaction);
    if (!isAuthorized) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_PERMISSION_ADMIN', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }
  } else {
    // Local guild operations (e.g., purge-server for current guild) require Administrator permission
    const member = interaction.memberPermissions;
    if (!member?.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_PERMISSION_ADMIN', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }
  }

  if (action === 'purge-user') {
    const userId = interaction.options.getString('user_id', true);
    await wordChainGameService.purgeUser(userId);

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('ADMIN_PURGE_USER_SUCCESS', locale, {
          userId,
        }),
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'purge-server') {
    const targetId = interaction.options.getString('guild_id', true);
    await wordChainGameService.purgeServer(targetId);

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('ADMIN_PURGE_SERVER_SUCCESS', locale, {
          guildId: targetId,
        }),
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'ban-member') {
    const userId = interaction.options.getString('user_id', true);
    const ban = interaction.options.getBoolean('ban') ?? true;

    await wordChainGameService.setMemberBan(userId, ban);

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('ADMIN_BAN_MEMBER_SUCCESS', locale, {
          userId,
          banned: ban ? 'BANNED' : 'UNBANNED',
        }),
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'ban-server') {
    const targetId = interaction.options.getString('guild_id', true);
    const ban = interaction.options.getBoolean('ban') ?? true;

    await wordChainGameService.setServerBan(targetId, ban);

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('ADMIN_BAN_SERVER_SUCCESS', locale, {
          guildId: targetId,
          banned: ban ? 'BANNED' : 'UNBANNED',
        }),
      );
    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
