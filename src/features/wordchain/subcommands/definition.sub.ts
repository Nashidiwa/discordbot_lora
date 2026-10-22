import { type ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { tWordChain } from '../wordchain.locale.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

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

  const rawWord = interaction.options.getString('word', true);
  const defs = await wordChainGameService.fetchDefinition(rawWord);

  if (!defs || defs.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.WARNING)
      .setTitle(tWordChain('DEF_TITLE', locale, { word: rawWord }))
      .setDescription(tWordChain('DEF_NOT_FOUND', locale, { word: rawWord }));
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EmbedColor.PRIMARY)
    .setTitle(tWordChain('DEF_TITLE', locale, { word: rawWord }))
    .setFooter({ text: 'Source: English Wiktionary (Wikimedia REST API)' });

  for (const entry of defs.slice(0, 3)) {
    const bulletDefs = entry.definitions.map((d, i) => `${i + 1}. ${d}`).join('\n');
    embed.addFields({
      name: `[${entry.partOfSpeech.toUpperCase()}]`,
      value: bulletDefs.length > 1024 ? `${bulletDefs.slice(0, 1021)}...` : bulletDefs,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
