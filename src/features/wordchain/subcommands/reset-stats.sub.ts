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

  const guildId = interaction.guildId;

  // 1. Delete all member stats for this guild
  await db.wordChainMember.deleteMany({
    where: { guildId },
  });

  // 2. Clear used words
  await db.wordChainUsedWord.deleteMany({
    where: { guildId },
  });

  // 3. Reset config chain counters & high scores
  await db.wordChainConfig.updateMany({
    where: { guildId },
    data: {
      currentCountNormal: 0,
      currentCountHard: 0,
      currentWordNormal: null,
      currentWordHard: null,
      lastMemberIdNormal: null,
      lastMemberIdHard: null,
      highScoreNormal: 0,
      highScoreHard: 0,
    },
  });

  // 4. Clear volatile memory history (DEC-007)
  wordChainGameService.clearHistory(guildId);

  const embed = new EmbedBuilder()
    .setColor(EmbedColor.SUCCESS)
    .setDescription(tWordChain('RESET_STATS_SUCCESS', locale));

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
