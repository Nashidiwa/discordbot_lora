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
import { addDonationSchema } from '../donator.types.js';
import {
  formatCurrencyVnd,
  formatDurationVietnamese,
} from '../donator.utils.js';
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
  const amount = interaction.options.getInteger('amount', true);
  const note = interaction.options.getString('note') ?? undefined;

  const parseResult = addDonationSchema.safeParse({
    targetUserId: targetUser.id,
    amountVnd: amount,
    note,
  });

  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ.';
    throw new AppError(errorMsg, 'VALIDATION_ERROR', true);
  }

  const validated = parseResult.data;

  const result = await donatorPerkService.addDonation({
    guildId: interaction.guildId!,
    userId: validated.targetUserId,
    amountVnd: validated.amountVnd,
    note: validated.note,
    createdBy: interaction.user.id,
    guild: interaction.guild!,
  });

  const bonusDescription = [
    `• Thưởng số tiền (Volume): **+${result.calculation.bonusVolumePercent}%**`,
    `• Thưởng chuỗi tuần (Streak): **+${result.calculation.bonusStreakPercent}%** (Bậc: **${result.calculation.newStreak}** tuần)`,
  ].join('\n');

  const addedTimeStr = `+${formatDurationVietnamese(result.calculation.creditSecondsAdded)} (${Math.floor(result.calculation.creditSecondsAdded).toLocaleString()} giây)`;
  const totalBalanceStr = `${formatDurationVietnamese(result.account.creditSeconds)} (${Math.floor(result.account.creditSeconds).toLocaleString()} giây)`;

  const embed = createBaseEmbed({
    color: EmbedColor.SUCCESS,
    title: t.ADD_SUCCESS_TITLE,
    description: t.ADD_SUCCESS_DESC.replace('{user}', `<@${targetUser.id}>`),
  }).addFields(
    {
      name: t.ADD_FIELD_RECIPIENT,
      value: `<@${targetUser.id}> (${targetUser.tag})`,
      inline: true,
    },
    {
      name: t.ADD_FIELD_AMOUNT,
      value: `**${formatCurrencyVnd(result.transaction.amountVnd)}**`,
      inline: true,
    },
    {
      name: t.ADD_FIELD_BONUS,
      value: bonusDescription,
      inline: false,
    },
    {
      name: t.ADD_FIELD_ADDED_TIME,
      value: `**${addedTimeStr}**`,
      inline: true,
    },
    {
      name: t.ADD_FIELD_TOTAL_CREDIT,
      value: `**${totalBalanceStr}**`,
      inline: true,
    },
    {
      name: t.ADD_FIELD_ROLE_STATUS,
      value: t.ADD_ROLE_EQUIPPED_MSG,
      inline: false,
    },
  );

  if (validated.note) {
    embed.addFields({
      name: t.ADD_FIELD_NOTE,
      value: validated.note,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
