import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type Role,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { getUserLocale } from '../../../shared/utils/i18n.util.js';
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

  // Permission Guard: User must have ManageGuild or Administrator
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
    const roleType = interaction.options.getString('type', true); // 'reliable' | 'failed'
    const role = interaction.options.getRole('role', true) as Role;

    // Hierarchy Guard: Bot must be able to manage this role
    const botMember = interaction.guild.members.me;
    if (
      !botMember?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      botMember.roles.highest.position <= role.position
    ) {
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.ERROR)
        .setDescription(tWordChain('ERR_ROLE_HIERARCHY', locale));
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (roleType === 'reliable') {
      await db.wordChainConfig.upsert({
        where: { guildId },
        create: { guildId, reliableRoleId: role.id },
        update: { reliableRoleId: role.id },
      });
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.SUCCESS)
        .setDescription(
          tWordChain('ROLE_SET_RELIABLE_SUCCESS', locale, {
            roleId: role.id,
          }),
        );
      await interaction.editReply({ embeds: [embed] });
    } else {
      await db.wordChainConfig.upsert({
        where: { guildId },
        create: { guildId, failedRoleId: role.id },
        update: { failedRoleId: role.id },
      });
      const embed = new EmbedBuilder()
        .setColor(EmbedColor.SUCCESS)
        .setDescription(
          tWordChain('ROLE_SET_FAILED_SUCCESS', locale, {
            roleId: role.id,
          }),
        );
      await interaction.editReply({ embeds: [embed] });
    }
    return;
  }

  if (action === 'unset') {
    const roleType = interaction.options.getString('type', true);

    if (roleType === 'reliable') {
      await db.wordChainConfig.updateMany({
        where: { guildId },
        data: { reliableRoleId: null },
      });
    } else {
      await db.wordChainConfig.updateMany({
        where: { guildId },
        data: { failedRoleId: null },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(EmbedColor.SUCCESS)
      .setDescription(
        tWordChain('ROLE_UNSET_SUCCESS', locale, {
          type: roleType === 'reliable' ? 'Reliable' : 'Failed',
        }),
      );

    await interaction.editReply({ embeds: [embed] });
  }
};

export default execute;
