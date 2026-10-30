import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import {
  ALL_PERMIT_FLAGS,
  PermitFlag,
  type PermitFlagKey,
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
  const flagChoice = interaction.options.getString('flag', true);

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

  let bitfieldToAdd = 0;
  if (flagChoice === 'ALL') {
    if (!resolved.isServerOwner && !resolved.isBotOwner) {
      throw new AppError(
        'Chỉ Server Owner hoặc Bot Owner mới có quyền cấp tất cả cờ quyền (ALL).',
        'PRIVILEGE_ESCALATION_BLOCKED',
        true,
      );
    }
    bitfieldToAdd = ALL_PERMIT_FLAGS;
  } else if (flagChoice in PermitFlag) {
    bitfieldToAdd = PermitFlag[flagChoice as PermitFlagKey];
  } else {
    throw new AppError(
      t(permitLocale, 'ERR_INVALID_FLAG', locale),
      'INVALID_FLAG',
      true,
    );
  }

  // Chống Privilege Escalation: Người cấp quyền không được cấp cờ mà mình không sở hữu
  if (
    !resolved.isServerOwner &&
    !resolved.isBotOwner &&
    (resolved.effectivePermissions & bitfieldToAdd) !== bitfieldToAdd
  ) {
    throw new AppError(
      'Bạn không thể cấp cờ quyền mà chính bạn không sở hữu.',
      'PRIVILEGE_ESCALATION_BLOCKED',
      true,
    );
  }

  // Lấy các quyền hiện tại của target (nếu đã có) để gộp thêm vào
  const assignments = await PermitService.getGuildAssignments(interaction.guildId);
  const existing = assignments.find(
    (a) => a.targetType === targetType && a.targetId === targetId,
  );

  const updatedPermissions = (existing?.permissions ?? 0) | bitfieldToAdd;

  await PermitService.assignPermit({
    guildId: interaction.guildId,
    targetType,
    targetId,
    tier: existing?.tier ?? PermitTier.CUSTOM,
    permissions: updatedPermissions,
    createdBy: interaction.user.id,
  });

  const embed = createBaseEmbed({
    title: 'Custom Permit Granted',
    description: t(permitLocale, 'GRANT_SUCCESS', locale)
      .replace('{target}', targetTag)
      .replace('{flag}', flagChoice),
    color: EmbedColor.SUCCESS,
  });

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
