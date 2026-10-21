import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { SwarmAuthService } from '../services/swarm-auth.service.js';
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

  const authUrl = SwarmAuthService.getAuthorizationUrl(
    interaction.user.id,
    interaction.guildId ?? undefined,
  );

  const title = t(swarmLocale, 'LINK_EMBED_TITLE', locale);
  const description = t(swarmLocale, 'LINK_EMBED_DESC', locale);
  const buttonLabel = t(swarmLocale, 'LINK_BUTTON_LABEL', locale);

  const embed = createBaseEmbed({
    title,
    description,
    color: EmbedColor.PRIMARY,
  });

  const button = new ButtonBuilder()
    .setLabel(buttonLabel)
    .setStyle(ButtonStyle.Link)
    .setURL(authUrl);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
};

export default execute;
