import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type TextChannel,
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

  // Permission Guard: ManageGuild or Administrator
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

  if (action === 'set') {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    const mode = interaction.options.getString('mode', true); // 'normal' | 'hard'

    const config = await wordChainGameService.getConfig(guildId);

    // Validate channel is not already used for the other mode
    if (mode === 'normal' && config?.hardModeChannelId === channel.id) {
      await interaction.editReply({
        content: tWordChain('ERR_CHANNEL_ALREADY_USED', locale),
      });
      return;
    }
    if (mode === 'hard' && config?.normalModeChannelId === channel.id) {
      await interaction.editReply({
        content: tWordChain('ERR_CHANNEL_ALREADY_USED', locale),
      });
      return;
    }

    if (mode === 'normal') {
      await db.wordChainConfig.upsert({
        where: { guildId },
        create: { guildId, normalModeChannelId: channel.id },
        update: { normalModeChannelId: channel.id },
      });
    } else {
      await db.wordChainConfig.upsert({
        where: { guildId },
        create: { guildId, hardModeChannelId: channel.id },
        update: { hardModeChannelId: channel.id },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('CHANNEL_SET_SUCCESS', locale, {
          channelId: channel.id,
          mode: mode.toUpperCase(),
        }),
      );

    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'unset') {
    const mode = interaction.options.getString('mode', true);

    if (mode === 'normal') {
      await db.wordChainConfig.updateMany({
        where: { guildId },
        data: { normalModeChannelId: null },
      });
    } else {
      await db.wordChainConfig.updateMany({
        where: { guildId },
        data: { hardModeChannelId: null },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('CHANNEL_UNSET_SUCCESS', locale, {
          mode: mode.toUpperCase(),
        }),
      );

    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
