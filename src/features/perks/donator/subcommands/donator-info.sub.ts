import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { EmbedColor } from '../../../../shared/constants/colors.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../../shared/utils/i18n.util.js';
import { donatorLocale } from '../donator.locale.js';

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

  const embed = createBaseEmbed({
    color: EmbedColor.PRIMARY,
    title: t.INFO_TITLE,
    description: t.INFO_DESC,
  }).addFields(
    {
      name: t.INFO_FIELD_TIMEBANK,
      value: t.INFO_FIELD_TIMEBANK_VAL,
    },
    {
      name: t.INFO_FIELD_VOLUME,
      value: t.INFO_FIELD_VOLUME_VAL,
    },
    {
      name: t.INFO_FIELD_STREAK,
      value: t.INFO_FIELD_STREAK_VAL,
    },
    {
      name: t.INFO_FIELD_GUIDE,
      value: t.INFO_FIELD_GUIDE_VAL,
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
