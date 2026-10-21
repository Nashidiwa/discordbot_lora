import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import {
  createErrorEmbed,
  createSuccessEmbed,
} from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { SwarmNotificationService } from '../services/swarm-notification.service.js';
import { SwarmOperatorService } from '../services/swarm-operator.service.js';
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

  if (!interaction.guildId) {
    const errorEmbed = createErrorEmbed(
      'Lệnh này chỉ có thể thực thi bên trong một máy chủ Discord.',
    );
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const action = interaction.options.getSubcommand();

  if (action === 'set') {
    const targetChannel = interaction.options.getChannel('channel', true);

    if (
      targetChannel.type !== ChannelType.GuildText &&
      targetChannel.type !== ChannelType.GuildAnnouncement
    ) {
      const errorEmbed = createErrorEmbed(
        t(swarmLocale, 'CHANNEL_NOT_FOUND', locale),
      );
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    await SwarmNotificationService.setGuildChannel(
      interaction.guildId,
      targetChannel.id,
    );

    const desc = t(swarmLocale, 'CHANNEL_SET_SUCCESS', locale).replace(
      '{channel}',
      `<#${targetChannel.id}>`,
    );
    const embed = createSuccessEmbed(desc);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'remove') {
    await SwarmNotificationService.removeGuildChannel(interaction.guildId);

    const desc = t(swarmLocale, 'CHANNEL_REMOVE_SUCCESS', locale);
    const embed = createSuccessEmbed(desc);
    await interaction.editReply({ embeds: [embed] });
    return;
  }
};

export default execute;
