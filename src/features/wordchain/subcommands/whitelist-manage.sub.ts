import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { WordChainLanguageService } from '../services/wordchain-language.service.js';
import { tWordChain } from '../wordchain.locale.js';

const langService = new WordChainLanguageService();

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
    await interaction.editReply({
      content: tWordChain('ERR_GUILD_ONLY', locale),
    });
    return;
  }

  // Permission Guard
  const member = interaction.memberPermissions;
  if (
    !member?.has(PermissionFlagsBits.ManageGuild) &&
    !member?.has(PermissionFlagsBits.Administrator)
  ) {
    await interaction.editReply({
      content: tWordChain('ERR_PERMISSION_MANAGE_GUILD', locale),
    });
    return;
  }

  const action = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (action === 'add') {
    const rawWord = interaction.options.getString('word', true);
    const normalized = langService.normalizeWord(rawWord);

    if (!langService.isValidWordFormat(normalized, 'en')) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_INVALID_WORD', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const existing = await db.wordChainWhitelist.findFirst({
      where: { guildId, word: normalized },
    });

    if (existing) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_WHITELIST_DUPLICATE', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    await db.wordChainWhitelist.create({
      data: { guildId, word: normalized },
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('WHITELIST_ADD_SUCCESS', locale, {
          word: normalized,
        }),
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'remove') {
    const rawWord = interaction.options.getString('word', true);
    const normalized = langService.normalizeWord(rawWord);

    const deleted = await db.wordChainWhitelist.deleteMany({
      where: { guildId, word: normalized },
    });

    if (deleted.count === 0) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_WHITELIST_NOT_FOUND', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('WHITELIST_REMOVE_SUCCESS', locale, {
          word: normalized,
        }),
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'show') {
    const list = await db.wordChainWhitelist.findMany({
      where: { guildId },
      orderBy: { word: 'asc' },
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle(tWordChain('WHITELIST_SHOW_TITLE', locale));

    if (list.length === 0) {
      embed.setDescription(tWordChain('WHITELIST_EMPTY', locale));
    } else {
      const words = list.map((w) => `\`${w.word}\``).join(', ');
      embed.setDescription(words.length > 2000 ? `${words.slice(0, 1990)}...` : words);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
