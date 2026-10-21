import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { SwarmMetadataService } from '../services/swarm-metadata.service.js';
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

  const targetUser =
    interaction.options.getUser('user') ?? interaction.user;

  const status = await SwarmMetadataService.getUserStatus(targetUser.id);

  const title = t(swarmLocale, 'STATUS_TITLE', locale);
  const embed = createBaseEmbed({
    title,
    color: status.swarmLevel > 0 ? EmbedColor.PRIMARY : EmbedColor.MUTED,
  })
    .setThumbnail(targetUser.displayAvatarURL())
    .setDescription(
      `Hồ sơ danh hiệu The Swarm của thành viên <@${targetUser.id}>:`,
    )
    .addFields(
      {
        name: t(swarmLocale, 'STATUS_FIELD_LEVEL', locale),
        value:
          status.swarmLevel > 0
            ? `**Level ${status.swarmLevel}**`
            : t(swarmLocale, 'STATUS_NO_ROLE', locale),
        inline: true,
      },
      {
        name: t(swarmLocale, 'STATUS_FIELD_ROLE', locale),
        value: status.roleName ? `**${status.roleName}**` : '---',
        inline: true,
      },
      {
        name: t(swarmLocale, 'STATUS_FIELD_OAUTH', locale),
        value: status.isLinked
          ? `🟢 ${t(swarmLocale, 'STATUS_LINKED', locale)}`
          : `🔴 ${t(swarmLocale, 'STATUS_NOT_LINKED', locale)}`,
        inline: false,
      },
    );

  if (status.tokenExpiresAt) {
    embed.addFields({
      name: t(swarmLocale, 'STATUS_FIELD_EXPIRES', locale),
      value: `<t:${Math.floor(status.tokenExpiresAt.getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  if (status.updatedAt) {
    embed.addFields({
      name: t(swarmLocale, 'STATUS_FIELD_UPDATED_AT', locale),
      value: `<t:${Math.floor(status.updatedAt.getTime() / 1000)}:R>`,
      inline: true,
    });
  }

  if (status.updatedBy) {
    embed.addFields({
      name: t(swarmLocale, 'STATUS_FIELD_UPDATED_BY', locale),
      value: `<@${status.updatedBy}>`,
      inline: true,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
