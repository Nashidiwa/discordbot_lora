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
import { setStreakSchema } from '../donator.types.js';
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
  const streak = interaction.options.getInteger('streak', true);

  const parseResult = setStreakSchema.safeParse({
    targetUserId: targetUser.id,
    streak,
  });

  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.errors[0]?.message ?? 'Dữ liệu không hợp lệ.';
    throw new AppError(errorMsg, 'VALIDATION_ERROR', true);
  }

  const validated = parseResult.data;

  const updatedAccount = await donatorPerkService.setStreak({
    guildId: interaction.guildId!,
    userId: validated.targetUserId,
    streak: validated.streak,
    createdBy: interaction.user.id,
  });

  const streakTier = StreakBonusTiers.find(
    (tier) => updatedAccount.streak >= tier.minStreak,
  );
  const bonusPercent = streakTier ? streakTier.percent : 0;

  const embed = createBaseEmbed({
    color: EmbedColor.SUCCESS,
    title: t.SET_STREAK_SUCCESS_TITLE,
    description: t.SET_STREAK_SUCCESS_DESC.replace(
      '{user}',
      `<@${targetUser.id}>`,
    ),
  }).addFields(
    {
      name: t.SET_STREAK_FIELD_TARGET,
      value: `<@${targetUser.id}>`,
      inline: true,
    },
    {
      name: t.SET_STREAK_FIELD_NEW_STREAK,
      value: `**${updatedAccount.streak} tuần**`,
      inline: true,
    },
    {
      name: t.SET_STREAK_FIELD_BONUS,
      value: `**+${bonusPercent}%**`,
      inline: true,
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
