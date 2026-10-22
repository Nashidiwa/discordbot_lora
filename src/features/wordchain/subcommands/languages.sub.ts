import { type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { tWordChain } from '../wordchain.locale.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId: interaction.guildId,
  });

  if (!interaction.guildId) {
    await interaction.editReply({
      content: tWordChain('ERR_GUILD_ONLY', locale),
    });
    return;
  }

  const config = await wordChainGameService.getConfig(interaction.guildId);
  const activeLangs = config?.languages ? config.languages.split(',') : ['en'];

  const embed = new EmbedBuilder()
    .setColor(EmbedColor.PRIMARY)
    .setTitle(tWordChain('LANG_ACTIVE_TITLE', locale))
    .setDescription(
      `${tWordChain('LANG_ACTIVE_DESC', locale)}\n` +
        activeLangs.map((code) => `• 🇬🇧 **English** (\`${code.trim()}\`)`).join('\n') +
        '\n\n-# Note: Currently English is the sole supported chaining language (DEC-001).',
    );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
