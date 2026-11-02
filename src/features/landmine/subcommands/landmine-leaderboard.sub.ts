import type { ChatInputCommandInteraction } from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
import { LeaderboardSortType } from '../landmine.constants.js';
import { landmineLocale } from '../landmine.locale.js';
import { landmineService } from '../services/landmine.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const guildId = interaction.guildId!;
  const locale = await getUserLocale({
    locale: interaction.locale,
    guildId,
  });
  const t = landmineLocale[locale];

  const scope = interaction.options.getString('module') ?? 'server';
  const sortParam =
    (interaction.options.getString('sort') as LeaderboardSortType) ??
    LeaderboardSortType.COUNT;

  const result = await landmineService.getLeaderboard(
    guildId,
    scope,
    sortParam,
    10,
  );

  const title = t.LEADERBOARD_TITLE.replace('{scope}', result.scope);
  const sortByDisplay =
    sortParam === LeaderboardSortType.DURATION
      ? locale === 'en'
        ? 'Total Timeout Duration'
        : 'Tổng thời gian phạt'
      : locale === 'en'
        ? 'Total Steps'
        : 'Tổng số lần dẫm mìn';

  if (result.entries.length === 0) {
    const embed = createBaseEmbed({
      title,
      description: t.LEADERBOARD_EMPTY,
    });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const lines = result.entries.map((entry, index) => {
    const medal = medals[index] ?? `\`#${index + 1}\``;
    const durationFormatted = landmineService.formatDurationSeconds(
      entry.totalTimeoutSeconds,
      locale,
    );

    return `${medal} <@${entry.userId}>\n   • **${entry.totalSteps}** ${t.LEADERBOARD_STEPS} (${t.LEADERBOARD_DETONATED}: **${entry.successCount}** | ${t.LEADERBOARD_HIGH_AURA}: **${entry.failedCount}**)\n   • ${t.LEADERBOARD_TOTAL_PUNISHMENT}: **${durationFormatted}**`;
  });

  let description = lines.join('\n\n');
  if (description.length > 4000) {
    description = `${description.slice(0, 3990)}...`;
  }

  const embed = createBaseEmbed({
    title,
    description,
  }).setFooter({
    text: t.LEADERBOARD_FOOTER.replace('{sortBy}', sortByDisplay),
  });

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
