import { type ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { tWordChain } from '../wordchain.locale.js';
import { buildHelpSelectMenu, DEFAULT_HELP_TOPIC } from '../events/wordchain-interaction.event.js';

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

  const defaultTopic = DEFAULT_HELP_TOPIC;

  const embed = new EmbedBuilder()
    .setColor(EmbedColor.PRIMARY)
    .setTitle(tWordChain('HELP_TITLE', locale))
    .setDescription(
      `${tWordChain('HELP_DESC', locale)}\n\n` +
        `### ${defaultTopic.title}\n` +
        (locale === 'vi' ? defaultTopic.descVi : defaultTopic.descEn),
    )
    .setFooter({ text: 'Word Chain • Dropdown Help System' });

  const row = buildHelpSelectMenu(interaction.user.id, 'how_to_play');

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
};

export default execute;
