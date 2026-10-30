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

  const botOwnerId = process.env.BOT_OWNER_ID ?? '';
  const isServerOwner = interaction.guild.ownerId === interaction.user.id;
  const isBotOwner = Boolean(botOwnerId && interaction.user.id === botOwnerId);

  // Chỉ Server Owner hoặc Bot Owner mới có quyền chỉ định Co-Owner
  if (!isServerOwner && !isBotOwner) {
    throw new AppError(
      t(permitLocale, 'ERR_SERVER_OWNER_ONLY', locale),
      'PERMISSION_DENIED',
      true,
    );
  }

  const action = interaction.options.getString('action', true);
  const targetUser = interaction.options.getUser('user', true);

  if (targetUser.bot) {
    throw new AppError(
      t(permitLocale, 'ERR_CANNOT_TARGET_BOT', locale),
      'INVALID_TARGET',
      true,
    );
  }

  if (targetUser.id === interaction.guild.ownerId) {
    throw new AppError(
      t(permitLocale, 'ERR_CANNOT_TARGET_OWNER', locale),
      'INVALID_TARGET',
      true,
    );
  }

  if (action === 'add') {
    await PermitService.assignPermit({
      guildId: interaction.guildId,
      targetType: PermitTargetType.USER,
      targetId: targetUser.id,
      tier: PermitTier.CO_OWNER,
      createdBy: interaction.user.id,
    });

    const embed = createBaseEmbed({
      title: 'Co-Owner Management',
      description: t(permitLocale, 'CO_OWNER_ADDED', locale).replace(
        '{target}',
        `<@${targetUser.id}>`,
      ),
      color: EmbedColor.SUCCESS,
    });

    await interaction.editReply({ embeds: [embed] });
  } else {
    await PermitService.revokePermit(
      interaction.guildId,
      PermitTargetType.USER,
      targetUser.id,
    );

    const embed = createBaseEmbed({
      title: 'Co-Owner Management',
      description: t(permitLocale, 'CO_OWNER_REMOVED', locale).replace(
        '{target}',
        `<@${targetUser.id}>`,
      ),
      color: EmbedColor.WARNING,
    });

    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
