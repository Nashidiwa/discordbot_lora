import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';
import { voiceKeeperLocale } from '../voice-keeper.locale.js';
import { VoiceConnectionStatusType } from '../voice-keeper.types.js';

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

  const status = await voiceKeeperService.getStatus(interaction.guild);

  if (!status.channelId) {
    const embed = createBaseEmbed({
      title: t(voiceKeeperLocale, 'STATUS_TITLE', locale),
      description: t(voiceKeeperLocale, 'STATUS_NOT_CONFIGURED', locale),
      color: EmbedColor.MUTED,
    });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  let embedColor: EmbedColor = EmbedColor.MUTED;
  let stateLabel = t(voiceKeeperLocale, 'STATE_IDLE', locale);

  switch (status.status) {
    case VoiceConnectionStatusType.READY:
      embedColor = EmbedColor.SUCCESS;
      stateLabel = t(voiceKeeperLocale, 'STATE_READY', locale);
      break;
    case VoiceConnectionStatusType.CONNECTING:
      embedColor = EmbedColor.WARNING;
      stateLabel = t(voiceKeeperLocale, 'STATE_CONNECTING', locale);
      break;
    case VoiceConnectionStatusType.RECONNECTING:
      embedColor = EmbedColor.WARNING;
      stateLabel = t(voiceKeeperLocale, 'STATE_RECONNECTING', locale);
      break;
    case VoiceConnectionStatusType.DISCONNECTED:
      embedColor = EmbedColor.ERROR;
      stateLabel = t(voiceKeeperLocale, 'STATE_DISCONNECTED', locale);
      break;
    case VoiceConnectionStatusType.SUSPENDED:
      embedColor = EmbedColor.ERROR;
      stateLabel = t(voiceKeeperLocale, 'STATE_SUSPENDED', locale);
      break;
    case VoiceConnectionStatusType.IDLE:
    default:
      embedColor = EmbedColor.MUTED;
      stateLabel = t(voiceKeeperLocale, 'STATE_IDLE', locale);
      break;
  }

  const embed = createBaseEmbed({
    title: t(voiceKeeperLocale, 'STATUS_TITLE', locale),
    color: embedColor,
  }).addFields(
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_CHANNEL', locale),
      value: `<#${status.channelId}> (${status.channelName ?? status.channelId})`,
      inline: false,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_STATE', locale),
      value: `**${stateLabel}**`,
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_AUTO_RECONNECT', locale),
      value: status.autoReconnect
        ? t(voiceKeeperLocale, 'ENABLED', locale)
        : t(voiceKeeperLocale, 'DISABLED', locale),
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_PING', locale),
      value: status.ping !== null ? `${status.ping}ms` : '---',
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_DEAF', locale),
      value: status.selfDeaf
        ? t(voiceKeeperLocale, 'ENABLED', locale)
        : t(voiceKeeperLocale, 'DISABLED', locale),
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_MUTE', locale),
      value: status.selfMute
        ? t(voiceKeeperLocale, 'ENABLED', locale)
        : t(voiceKeeperLocale, 'DISABLED', locale),
      inline: true,
    },
    {
      name: t(voiceKeeperLocale, 'STATUS_FIELD_RETRY', locale),
      value: `${status.reconnectAttempts}`,
      inline: true,
    },
  );

  if (status.lastConnectedAt) {
    embed.addFields({
      name: t(voiceKeeperLocale, 'STATUS_FIELD_CONNECTED_AT', locale),
      value: `<t:${Math.floor(status.lastConnectedAt.getTime() / 1000)}:R>`,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
