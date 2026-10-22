import {
  ChannelType,
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

  const channel = interaction.options.getChannel('channel', true);
  if (
    channel.type !== ChannelType.GuildVoice &&
    channel.type !== ChannelType.GuildStageVoice
  ) {
    throw new AppError(
      t(voiceKeeperLocale, 'ERR_INVALID_CHANNEL', locale),
      'INVALID_CHANNEL_TYPE',
      true,
    );
  }

  const selfDeaf = interaction.options.getBoolean('self_deaf') ?? true;
  const selfMute = interaction.options.getBoolean('self_mute') ?? true;
  const autoReconnect =
    interaction.options.getBoolean('auto_reconnect') ?? true;

  await voiceKeeperService.connect({
    guild: interaction.guild,
    channelId: channel.id,
    selfDeaf,
    selfMute,
    autoReconnect,
    updatedBy: interaction.user.id,
    isManual: true,
  });

  const successTitle = t(voiceKeeperLocale, 'SET_SUCCESS_TITLE', locale);
  const successDesc = t(voiceKeeperLocale, 'SET_SUCCESS_DESC', locale).replace(
    '{channelId}',
    channel.id,
  );

  const embed = createSuccessEmbed(successDesc, successTitle).addFields(
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_DEAF', locale),
      value: selfDeaf
        ? t(voiceKeeperLocale, 'ENABLED', locale)
        : t(voiceKeeperLocale, 'DISABLED', locale),
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_MUTE', locale),
      value: selfMute
        ? t(voiceKeeperLocale, 'ENABLED', locale)
        : t(voiceKeeperLocale, 'DISABLED', locale),
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_AUTO_RECONNECT', locale),
      value: autoReconnect
        ? t(voiceKeeperLocale, 'ENABLED', locale)
        : t(voiceKeeperLocale, 'DISABLED', locale),
      inline: true,
    },
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
