import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import {
  PermitFlag,
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

  if (!resolved.hasPermission(PermitFlag.MANAGE_PERMITS)) {
    throw new AppError(
      t(permitLocale, 'ERR_MANAGE_PERMITS_REQUIRED', locale),
      'PERMISSION_DENIED',
      true,
    );
  }

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

  // Kiểm tra nếu mục tiêu là Co-Owner thì chỉ Server Owner mới được thu hồi
  const assignments = await PermitService.getGuildAssignments(interaction.guildId);
  const existing = assignments.find(
    (a) => a.targetType === targetType && a.targetId === targetId,
  );

  if (
    existing?.tier === PermitTier.CO_OWNER &&
    !resolved.isServerOwner &&
    !resolved.isBotOwner
  ) {
    throw new AppError(
      t(permitLocale, 'ERR_SERVER_OWNER_ONLY', locale),
      'PERMISSION_DENIED',
      true,
    );
  }

  if (
    existing?.tier === PermitTier.TRUSTED_ADMIN &&
    !resolved.isServerOwner &&
    !resolved.isBotOwner &&
    !resolved.isCoOwner
  ) {
    throw new AppError(
      'Chỉ Server Owner, Co-Owner hoặc Bot Owner mới có quyền thu hồi Trusted Admin.',
      'PERMISSION_DENIED',
      true,
    );
  }

  await PermitService.revokePermit(interaction.guildId, targetType, targetId);

  const embed = createBaseEmbed({
    title: 'Custom Permit Revoked',
    description: t(permitLocale, 'REVOKE_SUCCESS', locale).replace(
      '{target}',
      targetTag,
    ),
    color: EmbedColor.WARNING,
  });

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
