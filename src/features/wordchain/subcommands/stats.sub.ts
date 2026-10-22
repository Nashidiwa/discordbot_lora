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

  const targetType = interaction.options.getString('type') ?? 'user';

  if (targetType === 'server') {
    const mode = interaction.options.getString('mode') ?? 'normal';
    const config = await wordChainGameService.getConfig(interaction.guildId);

    const isHard = mode === 'hard';
    const currentCount = isHard ? config?.currentCountHard ?? 0 : config?.currentCountNormal ?? 0;
    const highScore = isHard ? config?.highScoreHard ?? 0 : config?.highScoreNormal ?? 0;
    const currentWord = isHard ? config?.currentWordHard : config?.currentWordNormal;
    const lastMemberId = isHard ? config?.lastMemberIdHard : config?.lastMemberIdNormal;
    const channelId = isHard ? config?.hardModeChannelId : config?.normalModeChannelId;

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle(`${tWordChain('STATS_SERVER_TITLE', locale)} (${mode.toUpperCase()})`)
      .addFields(
        {
          name: tWordChain('STATS_CURRENT_CHAIN', locale),
          value: currentCount.toString(),
          inline: true,
        },
        {
          name: tWordChain('STATS_HIGH_SCORE', locale),
          value: highScore.toString(),
          inline: true,
        },
        {
          name: tWordChain('STATS_LAST_WORD', locale),
          value: currentWord ? `**${currentWord}**` : '*(none)*',
          inline: true,
        },
        {
          name: tWordChain('STATS_LAST_PLAYER', locale),
          value: lastMemberId ? `<@${lastMemberId}>` : '*(none)*',
          inline: true,
        },
        {
          name: tWordChain('STATS_CHANNEL', locale),
          value: channelId ? `<#${channelId}>` : '*(not configured)*',
          inline: true,
        },
      );

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // User stats
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const stats = await wordChainGameService.getMemberStats(interaction.guildId, targetUser.id);

  if (!stats) {
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.WARNING)
      .setTitle(tWordChain('STATS_USER_TITLE', locale))
      .setDescription(tWordChain('ERR_USER_NOT_FOUND', locale));
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(EmbedColor.PRIMARY)
    .setTitle(tWordChain('STATS_USER_TITLE', locale))
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      {
        name: tWordChain('STATS_SCORE', locale),
        value: stats.score.toString(),
        inline: true,
      },
      {
        name: tWordChain('STATS_KARMA', locale),
        value: stats.karma.toFixed(2),
        inline: true,
      },
      {
        name: tWordChain('STATS_ACCURACY', locale),
        value: `${(stats.accuracy * 100).toFixed(1)}%`,
        inline: true,
      },
      {
        name: tWordChain('STATS_CORRECT', locale),
        value: stats.correctInputs.toString(),
        inline: true,
      },
      {
        name: tWordChain('STATS_MISTAKES', locale),
        value: stats.wrongInputs.toString(),
        inline: true,
      },
      {
        name: tWordChain('STATS_RELIABLE', locale),
        value: stats.isReliable ? `✅ ${tWordChain('YES', locale)}` : `❌ ${tWordChain('NO', locale)}`,
        inline: true,
      },
      {
        name: tWordChain('STATS_FAILED', locale),
        value: stats.isFailed ? `⚠️ ${tWordChain('YES', locale)}` : `✅ ${tWordChain('NO', locale)}`,
        inline: true,
      },
    );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
