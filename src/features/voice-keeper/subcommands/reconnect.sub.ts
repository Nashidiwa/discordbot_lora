import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { createSuccessEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';
import { voiceKeeperLocale } from '../voice-keeper.locale.js';

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
    throw new AppError(
      t(voiceKeeperLocale, 'ERR_GUILD_ONLY', locale),
      'GUILD_ONLY',
      true,
    );
  }

  const memberPermissions = interaction.memberPermissions;
  const hasPermission =
    memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (!hasPermission) {
    throw new AppError(
      t(voiceKeeperLocale, 'ERR_PERMISSION_MANAGE_CHANNELS', locale),
      'PERMISSION_DENIED',
      true,
    );
  }

  const status = await voiceKeeperService.getStatus(interaction.guild);
  if (!status.channelId) {
    throw new AppError(
      t(voiceKeeperLocale, 'ERR_CONFIG_NOT_FOUND', locale),
      'CONFIG_NOT_FOUND',
      true,
    );
  }

  await voiceKeeperService.forceReconnect(
    interaction.guild,
    interaction.user.id,
  );

  const title = t(voiceKeeperLocale, 'RECONNECT_SUCCESS_TITLE', locale);
  const desc = t(voiceKeeperLocale, 'RECONNECT_SUCCESS_DESC', locale).replace(
    '{channelId}',
    status.channelId,
  );

  const embed = createSuccessEmbed(desc, title);
  await interaction.editReply({ embeds: [embed] });
};

export default execute;
