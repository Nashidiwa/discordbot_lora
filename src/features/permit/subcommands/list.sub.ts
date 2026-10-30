import {
  type ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { AppError } from '../../../core/errors.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import {
  PermitFlag,
  type PermitFlagKey,
  PermitTargetType,
  PermitService,
} from '../../../shared/permit/index.js';
import { createBaseEmbed } from '../../../shared/utils/embed.util.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { permitLocale } from '../permit.locale.js';

function formatFlagList(permissions: number): string {
  const flags: string[] = [];
  for (const [key, value] of Object.entries(PermitFlag)) {
    if ((permissions & value) === value) {
      flags.push(`\`${key}\``);
    }
  }
  return flags.length > 0 ? flags.join(', ') : '*(None)*';
}

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
      t(permitLocale, 'ERR_GUILD_ONLY', locale),
      'GUILD_ONLY',
      true,
    );
  }

  const overview = await PermitService.getGuildPermitOverview(
    interaction.guildId,
  );

  const coOwnersText =
    overview.coOwners.length > 0
      ? overview.coOwners.map((a) => `• <@${a.targetId}>`).join('\n')
      : t(permitLocale, 'LIST_EMPTY', locale);

  const trustedAdminsText =
    overview.trustedAdmins.length > 0
      ? overview.trustedAdmins
          .map((a) =>
            a.targetType === PermitTargetType.USER
              ? `• 👤 <@${a.targetId}>`
              : `• 🛡️ <@&${a.targetId}>`,
          )
          .join('\n')
      : t(permitLocale, 'LIST_EMPTY', locale);

  const customPermitsText =
    overview.customPermits.length > 0
      ? overview.customPermits
          .map((a) => {
            const tag =
              a.targetType === PermitTargetType.USER
                ? `👤 <@${a.targetId}>`
                : `🛡️ <@&${a.targetId}>`;
            return `• ${tag} $\\rightarrow$ ${formatFlagList(a.permissions)}`;
          })
          .join('\n')
      : t(permitLocale, 'LIST_EMPTY', locale);

  const embed = createBaseEmbed({
    title: t(permitLocale, 'LIST_TITLE', locale),
    description: `👑 **Server Owner:** <@${interaction.guild.ownerId}>\n⚙️ **Trusted Admin Default:** ${formatFlagList(overview.config.trustedAdminFlags)}`,
    color: EmbedColor.PRIMARY,
  })
    .addFields(
      {
        name: t(permitLocale, 'LIST_CO_OWNER_TITLE', locale).replace(
          '{count}',
          String(overview.coOwners.length),
        ),
        value: coOwnersText,
        inline: false,
      },
      {
        name: t(permitLocale, 'LIST_TRUSTED_ADMIN_TITLE', locale).replace(
          '{count}',
          String(overview.trustedAdmins.length),
        ),
        value: trustedAdminsText,
        inline: false,
      },
      {
        name: t(permitLocale, 'LIST_CUSTOM_PERMITS_TITLE', locale).replace(
          '{count}',
          String(overview.customPermits.length),
        ),
        value: customPermitsText,
        inline: false,
      },
    )
    .setFooter({
      text: t(permitLocale, 'LIST_FOOTER', locale),
    });

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
