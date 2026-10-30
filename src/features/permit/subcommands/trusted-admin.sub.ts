import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import {
  PermitTargetType,
  PermitTier,
  PermitService,
} from '../../../shared/permit/index.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { permitLocale } from '../permit.locale.js';

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

  if (!interaction.guildId || !interaction.guild) {
    throw new AppError(
      t(permitLocale, 'ERR_GUILD_ONLY', locale),
      'GUILD_ONLY',
      true,
    );
  }

  const memberRoles = interaction.member && 'roles' in interaction.member && Array.isArray(interaction.member.roles)
    ? interaction.member.roles
    : interaction.member && 'roles' in interaction.member && 'cache' in interaction.member.roles
      ? Array.from(interaction.member.roles.cache.keys())
      : [];

  const resolved = await PermitService.resolveMemberPermissions({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    memberRoleIds: memberRoles,
    serverOwnerId: interaction.guild.ownerId,
    botOwnerId: process.env.BOT_OWNER_ID,
  });

  // Chỉ Server Owner, Co-Owner hoặc Bot Owner mới có quyền quản lý Trusted Admin
  if (!resolved.isServerOwner && !resolved.isBotOwner && !resolved.isCoOwner) {
    throw new AppError(
      t(permitLocale, 'ERR_CO_OWNER_PERMISSION', locale),
      'PERMISSION_DENIED',
      true,
    );
  }

  const action = interaction.options.getString('action', true);
  const targetUser = interaction.options.getUser('user');
  const targetRole = interaction.options.getRole('role');

  if (!targetUser && !targetRole) {
    throw new AppError(
      t(permitLocale, 'ERR_TARGET_NOT_FOUND', locale),
      'INVALID_TARGET',
      true,
    );
  }

  const targetType = targetUser ? PermitTargetType.USER : PermitTargetType.ROLE;
  const targetId = targetUser ? targetUser.id : targetRole!.id;
  const targetTag = targetUser ? `<@${targetUser.id}>` : `<@&${targetRole!.id}>`;

  if (targetUser?.bot) {
    throw new AppError(
      t(permitLocale, 'ERR_CANNOT_TARGET_BOT', locale),
      'INVALID_TARGET',
      true,
    );
  }

  if (targetUser?.id === interaction.guild.ownerId) {
    throw new AppError(
      t(permitLocale, 'ERR_CANNOT_TARGET_OWNER', locale),
      'INVALID_TARGET',
      true,
    );
  }

  if (action === 'add') {
    await PermitService.assignPermit({
      guildId: interaction.guildId,
      targetType,
      targetId,
      tier: PermitTier.TRUSTED_ADMIN,
      createdBy: interaction.user.id,
    });

    const embed = createBaseEmbed({
      title: 'Trusted Admin Management',
      description: t(permitLocale, 'TRUSTED_ADMIN_ADDED', locale).replace(
        '{target}',
        targetTag,
      ),
      color: EmbedColor.SUCCESS,
    });

    await interaction.editReply({ embeds: [embed] });
  } else {
    await PermitService.revokePermit(interaction.guildId, targetType, targetId);

    const embed = createBaseEmbed({
      title: 'Trusted Admin Management',
      description: t(permitLocale, 'TRUSTED_ADMIN_REMOVED', locale).replace(
        '{target}',
        targetTag,
      ),
      color: EmbedColor.WARNING,
    });

    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
