import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { AppError } from '../../../../core/errors.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { EmbedColor } from '../../../../shared/constants/colors.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../../shared/utils/i18n.util.js';
import { DonatorErrorCode } from '../donator.constants.js';
import { donatorLocale } from '../donator.locale.js';
import { adjustCreditSchema } from '../donator.types.js';
import { formatDurationVietnamese } from '../donator.utils.js';
import { donatorPerkService } from '../services/donator-perk.service.js';

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
  const t = donatorLocale[locale];

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    throw new AppError(
      t.ADMIN_ONLY,
      DonatorErrorCode.PERMISSION_DENIED,
      true,
    );
  }

  const targetUser = interaction.options.getUser('user', true);
  const seconds = interaction.options.getInteger('seconds', true);
  const reason = interaction.options.getString('reason') ?? undefined;

  const parseResult = adjustCreditSchema.safeParse({
    targetUserId: targetUser.id,
    seconds,
    reason,
  });

  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ.';
    throw new AppError(errorMsg, 'VALIDATION_ERROR', true);
  }

  const validated = parseResult.data;

  const updatedAccount = await donatorPerkService.adjustCredit({
    guildId: interaction.guildId!,
    userId: validated.targetUserId,
    seconds: validated.seconds,
    reason: validated.reason,
    createdBy: interaction.user.id,
  });

  const deltaSign = validated.seconds > 0 ? '+' : '';
  const deltaStr = `${deltaSign}${validated.seconds.toLocaleString()} giây (${formatDurationVietnamese(Math.abs(validated.seconds))})`;
  const newBalanceStr = `${formatDurationVietnamese(updatedAccount.creditSeconds)} (${Math.floor(updatedAccount.creditSeconds).toLocaleString()} giây)`;

  const embed = createBaseEmbed({
    color: EmbedColor.SUCCESS,
    title: t.ADJUST_SUCCESS_TITLE,
    description: t.ADJUST_SUCCESS_DESC.replace('{user}', `<@${targetUser.id}>`),
  }).addFields(
    {
      name: t.ADJUST_FIELD_TARGET,
      value: `<@${targetUser.id}>`,
      inline: true,
    },
    {
      name: t.ADJUST_FIELD_AMOUNT,
      value: `**${deltaStr}**`,
      inline: true,
    },
    {
      name: t.ADJUST_FIELD_NEW_BALANCE,
      value: `**${newBalanceStr}**`,
      inline: false,
    },
    {
      name: t.ADJUST_FIELD_REASON,
      value: validated.reason ?? 'Không có',
      inline: false,
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
