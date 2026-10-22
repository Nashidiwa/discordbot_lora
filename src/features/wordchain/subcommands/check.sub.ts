import { type ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { tWordChain } from '../wordchain.locale.js';
import { WordChainLanguageService } from '../services/wordchain-language.service.js';
import { WordChainDictionaryService } from '../services/wordchain-dictionary.service.js';
import { ApiResponse } from '../types/wordchain.types.js';

const langService = new WordChainLanguageService();
const dictService = new WordChainDictionaryService();

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
  const normalized = langService.normalizeWord(rawWord);

  // 1. Length & format check
  if (!langService.isValidWordFormat(normalized, 'en')) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.ERROR)
      .setTitle(tWordChain('CHECK_INVALID_TITLE', locale))
      .setDescription(
        tWordChain('CHECK_INVALID_DESC', locale, {
          word: rawWord,
          reason: 'Word does not match English regex pattern or contains invalid characters',
        }),
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // 2. Fetch guild whitelist & blacklist if executing inside a guild
  let whitelist: Set<string> | undefined;
  let blacklist: Set<string> | undefined;

  if (interaction.guildId) {
    const [wlRows, blRows] = await Promise.all([
      db.wordChainWhitelist.findMany({
        where: { guildId: interaction.guildId },
        select: { word: true },
      }),
      db.wordChainBlacklist.findMany({
        where: { guildId: interaction.guildId },
        select: { word: true },
      }),
    ]);
    whitelist = new Set(wlRows.map((r) => r.word));
    blacklist = new Set(blRows.map((r) => r.word));
  }

  // 3. Dictionary verification
  const result = await dictService.validateWord(normalized, 'en', { whitelist, blacklist });

  if (result === ApiResponse.WORD_EXISTS) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setTitle(tWordChain('CHECK_VALID_TITLE', locale))
      .setDescription(
        tWordChain('CHECK_VALID_DESC', locale, {
          word: normalized,
        }),
      );
    await interaction.editReply({ embeds: [embed] });
  } else {
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.ERROR)
      .setTitle(tWordChain('CHECK_INVALID_TITLE', locale))
      .setDescription(
        tWordChain('CHECK_INVALID_DESC', locale, {
          word: normalized,
          reason: result === ApiResponse.ERROR ? 'Dictionary API timeout / error' : 'Word not found in dictionary',
        }),
      );
    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
