import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import {
  createBaseEmbed,
  createErrorEmbed,
} from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { SwarmMetadataService } from '../services/swarm-metadata.service.js';
import { SwarmNotificationService } from '../services/swarm-notification.service.js';
import { SwarmOperatorService } from '../services/swarm-operator.service.js';
import { SwarmRoleNames } from '../swarm.constants.js';
import { swarmLocale } from '../swarm.locale.js';

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

  const isOperator = await SwarmOperatorService.isOperator(
    interaction.client,
    interaction.user.id,
  );

  if (!isOperator) {
    const errorEmbed = createErrorEmbed(
      t(swarmLocale, 'OPERATOR_ONLY', locale),
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const level = interaction.options.getInteger('level', true);

  if (level < 1 || level > 8) {
    const errorEmbed = createErrorEmbed(
      t(swarmLocale, 'INVALID_LEVEL', locale),
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const roleName = SwarmRoleNames[level - 1] ?? `The Swarm ${level}`;

  const { synced } = await SwarmMetadataService.setUserLevel(
    targetUser.id,
    level,
    interaction.user.id,
    targetUser.username,
  );

  // Send announcement to guild channel if inside a guild
  if (interaction.guildId) {
    await SwarmNotificationService.sendUpgradeAnnouncement(
      interaction.client,
      interaction.guildId,
      targetUser.id,
      level,
      roleName,
    );
  }

  const syncStatus = synced
    ? t(swarmLocale, 'SYNC_SUCCESS', locale)
    : t(swarmLocale, 'SYNC_PENDING_LINK', locale);

  const title = t(swarmLocale, 'SET_SUCCESS_TITLE', locale);
  const descTemplate = t(swarmLocale, 'SET_SUCCESS_DESC', locale);
  const description = descTemplate
    .replace('{user}', `<@${targetUser.id}>`)
    .replace('{level}', String(level))
    .replace('{roleName}', roleName)
    .replace('{syncStatus}', syncStatus);

  const embed = createBaseEmbed({
    title,
    description,
    color: EmbedColor.SUCCESS,
  });

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
