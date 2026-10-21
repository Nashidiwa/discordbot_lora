import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import {
  createBaseEmbed,
  createErrorEmbed,
  createSuccessEmbed,
} from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
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

  const isOwner = await SwarmOperatorService.isBotOwner(
    interaction.client,
    interaction.user.id,
  );

  if (!isOwner) {
    const errorEmbed = createErrorEmbed(t(swarmLocale, 'OWNER_ONLY', locale));
    await interaction.editReply({ embeds: [errorEmbed] });
    return;
  }

  const action = interaction.options.getSubcommand();

  if (action === 'add') {
    const targetUser = interaction.options.getUser('user', true);
    await SwarmOperatorService.addOperator(
      interaction.client,
      interaction.user.id,
      targetUser.id,
    );

    const desc = t(swarmLocale, 'DELEGATE_ADD_SUCCESS', locale).replace(
      '{user}',
      `<@${targetUser.id}>`,
    );
    const embed = createSuccessEmbed(desc);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'remove') {
    const targetUser = interaction.options.getUser('user', true);
    await SwarmOperatorService.removeOperator(
      interaction.client,
      interaction.user.id,
      targetUser.id,
    );

    const desc = t(swarmLocale, 'DELEGATE_REMOVE_SUCCESS', locale).replace(
      '{user}',
      `<@${targetUser.id}>`,
    );
    const embed = createSuccessEmbed(desc);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  if (action === 'list') {
    const operators = await SwarmOperatorService.getOperators();
    const title = t(swarmLocale, 'DELEGATE_LIST_TITLE', locale);

    if (operators.length === 0) {
      const emptyDesc = t(swarmLocale, 'DELEGATE_LIST_EMPTY', locale);
      const embed = createBaseEmbed({
        title,
        description: emptyDesc,
        color: EmbedColor.MUTED,
      });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const operatorLines = operators.map((op, idx) => {
      const timeStr = Math.floor(op.createdAt.getTime() / 1000);
      return `**${idx + 1}.** <@${op.userId}> (Thêm bởi: <@${op.addedBy}> - <t:${timeStr}:d>)`;
    });

    const embed = createBaseEmbed({
      title,
      description: operatorLines.join('\n'),
      color: EmbedColor.PRIMARY,
    });

    await interaction.editReply({ embeds: [embed] });
    return;
  }
};

export default execute;
