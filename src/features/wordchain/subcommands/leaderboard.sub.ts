import { type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
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

  const type = interaction.options.getString('type') ?? 'user';
  const metric = interaction.options.getString('metric') ?? 'score';
  const scope = interaction.options.getString('scope') ?? 'server';
  const mode = interaction.options.getString('mode') ?? 'normal';

  if (type === 'server') {
    // Server high score leaderboard
    const orderField = mode === 'hard' ? 'highScoreHard' : 'highScoreNormal';
    const servers = await db.wordChainConfig.findMany({
      where: { isBanned: false, leftAt: null },
      orderBy: { [orderField]: 'desc' },
      take: 10,
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle(
        tWordChain('LB_TITLE_SERVER', locale, {
          mode: mode.toUpperCase(),
        }),
      );

    if (servers.length === 0) {
      embed.setDescription(tWordChain('LB_EMPTY', locale));
    } else {
      const lines = servers.map((s, index) => {
        const hs = mode === 'hard' ? s.highScoreHard : s.highScoreNormal;
        return tWordChain('LB_ROW_SERVER', locale, {
          rank: (index + 1).toString(),
          guildId: s.guildId,
          highScore: hs.toString(),
        });
      });
      embed.setDescription(lines.join('\n'));
    }

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // User leaderboard
  if (scope === 'server') {
    if (!interaction.guildId) {
      await interaction.editReply({
        content: tWordChain('ERR_GUILD_ONLY', locale),
      });
      return;
    }

    const members = await wordChainGameService.getLeaderboard(interaction.guildId, 10);
    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle(
        tWordChain('LB_TITLE_USER_SERVER', locale, {
          metric: metric.toUpperCase(),
        }),
      );

    if (members.length === 0) {
      embed.setDescription(tWordChain('LB_EMPTY', locale));
    } else {
      const lines = members.map((m) =>
        tWordChain('LB_ROW', locale, {
          rank: m.rank.toString(),
          userId: m.id,
          score: m.score.toString(),
          karma: m.karma.toFixed(2),
        }),
      );
      embed.setDescription(lines.join('\n'));
    }

    await interaction.editReply({ embeds: [embed] });
  } else {
    // Global user leaderboard: Filter banned users & departed/banned guilds, aggregate across guilds
    const [bannedUsers, bannedGuilds] = await Promise.all([
      db.wordChainBannedMember.findMany({ select: { userId: true } }),
      db.wordChainConfig.findMany({
        where: { OR: [{ isBanned: true }, { leftAt: { not: null } }] },
        select: { guildId: true },
      }),
    ]);
    const bannedUserIds = bannedUsers.map((b) => b.userId);
    const bannedGuildIds = bannedGuilds.map((g) => g.guildId);

    const members = await db.wordChainMember.groupBy({
      by: ['userId'],
      where: {
        userId: { notIn: bannedUserIds },
        guildId: { notIn: bannedGuildIds },
      },
      _sum: { score: true },
      _avg: { karma: true },
      orderBy:
        metric === 'karma'
          ? [{ _avg: { karma: 'desc' } }, { _sum: { score: 'desc' } }]
          : [{ _sum: { score: 'desc' } }, { _avg: { karma: 'desc' } }],
      take: 10,
    });

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.PRIMARY)
      .setTitle(
        tWordChain('LB_TITLE_USER_GLOBAL', locale, {
          metric: metric.toUpperCase(),
        }),
      );

    if (members.length === 0) {
      embed.setDescription(tWordChain('LB_EMPTY', locale));
    } else {
      const lines = members.map((m, index) =>
        tWordChain('LB_ROW', locale, {
          rank: (index + 1).toString(),
          userId: m.userId,
          score: (m._sum.score ?? 0).toString(),
          karma: (m._avg.karma ?? 0).toFixed(2),
        }),
      );
      embed.setDescription(lines.join('\n'));
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
