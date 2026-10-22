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
import { wordChainGameService } from '../services/wordchain-game.service.js';
import { tWordChain } from '../wordchain.locale.js';

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
  const config = await wordChainGameService.getConfig(guildId);
  const activeLangs = config?.languages ? config.languages.split(',').map((l) => l.trim()) : ['en'];

  if (action === 'show-all') {
    const isEnActive = activeLangs.includes('en');
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle(tWordChain('LANG_SHOW_ALL_TITLE', locale))
      .setDescription(
        `• ${isEnActive ? '✅' : '⬜'} 🇬🇧 **English** (\`en\`) - Active in initial release\n` +
          '• ⬜ 🇫🇷 Français (`fr`) - *Coming in future phase*\n' +
          '• ⬜ 🇩🇪 Deutsch (`de`) - *Coming in future phase*\n' +
          '• ⬜ 🇪🇸 Español (`es`) - *Coming in future phase*\n' +
          '• ⬜ 🇻🇳 Tiếng Việt (`vi`) - *Phonologically deferred (DEC-001)*\n\n' +
          '-# Server limit: Maximum 2 simultaneous active languages.',
      );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'add') {
    const code = interaction.options.getString('language_code', true).toLowerCase().trim();

    // DEC-001: Initial release scope limitation
    if (code !== 'en') {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_LANGUAGE_NOT_SUPPORTED', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (activeLangs.length >= 2 && !activeLangs.includes(code)) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_LANGUAGE_MAX', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!activeLangs.includes(code)) {
      activeLangs.push(code);
      await db.wordChainConfig.upsert({
        where: { guildId },
        create: { guildId, languages: activeLangs.join(',') },
        update: { languages: activeLangs.join(',') },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(`Added language **${code.toUpperCase()}**.`);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'remove') {
    const code = interaction.options.getString('language_code', true).toLowerCase().trim();

    if (activeLangs.length <= 1) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_LANGUAGE_MIN', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const nextLangs = activeLangs.filter((l) => l !== code);
    await db.wordChainConfig.upsert({
      where: { guildId },
      create: { guildId, languages: nextLangs.join(',') },
      update: { languages: nextLangs.join(',') },
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(`Removed language **${code.toUpperCase()}**.`);
    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
