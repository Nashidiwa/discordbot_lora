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
import {
  DonatorErrorCode,
  StreakBonusTiers,
} from '../donator.constants.js';
import { donatorLocale } from '../donator.locale.js';
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

  const targetOption = interaction.options.getUser('member');
  const isCheckingOther = Boolean(
    targetOption && targetOption.id !== interaction.user.id,
  );

  if (
    isCheckingOther &&
    !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
  ) {
    throw new AppError(
      t.PERMISSION_DENIED,
      DonatorErrorCode.PERMISSION_DENIED,
      true,
    );
  }

  const targetUser = targetOption ?? interaction.user;
  const guildId = interaction.guildId!;

  const status = await donatorPerkService.getAccountStatus(
    guildId,
    targetUser.id,
  );

  const title = t.STATUS_TITLE.replace('{user}', targetUser.displayName || targetUser.username);

  if (!status || (status.creditSeconds <= 0 && status.totalDonatedVnd === 0n)) {
    const description = isCheckingOther
      ? t.STATUS_NO_ACCOUNT_OTHER.replace('{user}', `<@${targetUser.id}>`)
      : t.STATUS_NO_ACCOUNT_SELF;

    const embed = createBaseEmbed({
      color: EmbedColor.WARNING,
      title,
      description,
    });

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  let burnRateText: string = t.STATUS_VAULT_TEXT;
  if (!status.isEnabled) {
    burnRateText = t.STATUS_FROZEN_TEXT;
  } else if (status.isEquipped) {
    burnRateText = t.STATUS_EQUIPPED_TEXT;
  }

  const streakTier = StreakBonusTiers.find(
    (tier) => status.streak >= tier.minStreak,
  );
  const streakPercent = streakTier ? streakTier.percent : 0;

  const streakFieldValue = [
    `• Bậc hiện tại: **${status.streak} tuần** (+${streakPercent}% bonus)`,
    `• Tích lũy tuần này (UTC+7): **${formatCurrencyVnd(status.currentWeekTotalVnd)} / 50.000đ**`,
  ].join('\n');

  let depletionText: string = t.STATUS_INDEFINITE_TEXT;
  if (!status.isEnabled) {
    depletionText = t.STATUS_FROZEN_TEXT;
  } else if (status.creditSeconds <= 0) {
    depletionText = t.STATUS_DEPLETED_TEXT;
  } else if (status.estimatedDepletionDate) {
    const unixTimestamp = Math.floor(
      status.estimatedDepletionDate.getTime() / 1000,
    );
    depletionText = `<t:${unixTimestamp}:F> (<t:${unixTimestamp}:R>)`;
  }

  const balanceText = `${formatDurationVietnamese(status.creditSeconds)} (${Math.floor(status.creditSeconds).toLocaleString()} giây)`;

  const embed = createBaseEmbed({
    color: status.isEquipped ? EmbedColor.PRIMARY : EmbedColor.WARNING,
    title,
    description: `Hồ sơ quyền lợi Donator của <@${targetUser.id}>:`,
  }).addFields(
    {
      name: t.STATUS_FIELD_BALANCE,
      value: `**${balanceText}**`,
      inline: false,
    },
    {
      name: t.STATUS_FIELD_EQUIP,
      value: burnRateText,
      inline: false,
    },
    {
      name: t.STATUS_FIELD_STREAK,
      value: streakFieldValue,
      inline: false,
    },
    {
      name: t.STATUS_FIELD_DEPLETION,
      value: depletionText,
      inline: false,
    },
  );

  const isAdmin = interaction.memberPermissions?.has(
    PermissionFlagsBits.Administrator,
  );
  if (isAdmin || isCheckingOther) {
    const lastDonation = await donatorPerkService.getLastDonation(
      guildId,
      targetUser.id,
    );

    const donationDetails = [
      `• Tổng tích lũy: **${formatCurrencyVnd(status.totalDonatedVnd)}**`,
    ];

    if (lastDonation) {
      const donationTime = Math.floor(lastDonation.createdAt.getTime() / 1000);
      donationDetails.push(
        `• Lần nạp gần nhất: **${formatCurrencyVnd(lastDonation.amountVnd)}** (<t:${donationTime}:R>)`,
      );
    }

    embed.addFields({
      name: t.STATUS_FIELD_TOTAL_DONATED,
      value: donationDetails.join('\n'),
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
