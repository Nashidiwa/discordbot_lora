import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  Role,
} from 'discord.js';
import { AppError } from '../../../../core/errors.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { EmbedColor } from '../../../../shared/constants/colors.js';
import {
  createBaseEmbed,
  createSuccessEmbed,
} from '../../../../shared/utils/embed.util.js';
import { getUserLocale } from '../../../../shared/utils/i18n.util.js';
import { DonatorConfigSubcommand, DonatorErrorCode } from '../donator.constants.js';
import { donatorLocale } from '../donator.locale.js';
import { formatCurrencyVnd } from '../donator.utils.js';
import { donatorPerkService } from '../services/donator-perk.service.js';

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
  const t = donatorLocale[locale];

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    throw new AppError(
      t.ADMIN_ONLY,
      DonatorErrorCode.PERMISSION_DENIED,
      true,
    );
  }

  const action = interaction.options.getString('action', true);
  const guildId = interaction.guildId!;

  switch (action) {
    case DonatorConfigSubcommand.VIEW: {
      const config = await donatorPerkService.getOrCreateConfig(guildId);

      const statusText = config.isEnabled
        ? t.CONFIG_STATUS_ON
        : t.CONFIG_STATUS_OFF;
      const roleText = config.donatorRoleId
        ? `<@&${config.donatorRoleId}>`
        : t.CONFIG_NOT_CONFIGURED;
      const channelText = config.notificationChannelId
        ? `<#${config.notificationChannelId}>`
        : t.CONFIG_DEFAULT_DM;
      const benchmarkText = `${formatCurrencyVnd(config.baseBenchmarkVnd)} = ${config.baseBenchmarkDays} ngày`;
      const weeklyMinText = `${formatCurrencyVnd(config.weeklyMinVnd)} / tuần`;
      const vaultRateText = `${config.idleBurnRate}x (Tiết kiệm gấp ${Math.round(1 / config.idleBurnRate)} lần)`;

      const embed = createBaseEmbed({
        color: EmbedColor.PRIMARY,
        title: t.CONFIG_VIEW_TITLE,
        description: t.CONFIG_VIEW_DESC,
      }).addFields(
        {
          name: t.CONFIG_FIELD_STATUS,
          value: `**${statusText}**`,
          inline: true,
        },
        {
          name: t.CONFIG_FIELD_ROLE,
          value: roleText,
          inline: true,
        },
        {
          name: t.CONFIG_FIELD_CHANNEL,
          value: channelText,
          inline: true,
        },
        {
          name: t.CONFIG_FIELD_BENCHMARK,
          value: benchmarkText,
          inline: true,
        },
        {
          name: t.CONFIG_FIELD_WEEKLY_MIN,
          value: weeklyMinText,
          inline: true,
        },
        {
          name: t.CONFIG_FIELD_VAULT_RATE,
          value: vaultRateText,
          inline: true,
        },
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    case DonatorConfigSubcommand.SET_ROLE: {
      const rawRole = interaction.options.getRole('role');
      if (!rawRole) {
        throw new AppError(t.CONFIG_ROLE_REQUIRED, 'INVALID_INPUT', true);
      }

      const role =
        rawRole instanceof Role
          ? rawRole
          : await interaction.guild!.roles.fetch(rawRole.id);

      if (!role) {
        throw new AppError(
          'Không tìm thấy Role trên máy chủ Discord.',
          DonatorErrorCode.ROLE_NOT_CONFIGURED,
          true,
        );
      }

      await donatorPerkService.setRole(
        guildId,
        role,
        interaction.guild!,
      );

      const embed = createSuccessEmbed(
        t.CONFIG_ROLE_SUCCESS_DESC.replace('{role}', `<@&${role.id}>`),
        t.CONFIG_ROLE_SUCCESS_TITLE,
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    case DonatorConfigSubcommand.SET_CHANNEL: {
      const channel = interaction.options.getChannel('channel');

      if (channel) {
        await donatorPerkService.setNotificationChannel(guildId, channel.id);
        const embed = createSuccessEmbed(
          t.CONFIG_CHANNEL_SUCCESS_DESC.replace('{channel}', `<#${channel.id}>`),
          t.CONFIG_CHANNEL_SUCCESS_TITLE,
        );
        await interaction.editReply({ embeds: [embed] });
      } else {
        await donatorPerkService.setNotificationChannel(guildId, null);
        const embed = createSuccessEmbed(
          t.CONFIG_CHANNEL_CLEARED_DESC,
          t.CONFIG_CHANNEL_CLEARED_TITLE,
        );
        await interaction.editReply({ embeds: [embed] });
      }
      return;
    }

    default:
      throw new AppError('Hành động cấu hình không hợp lệ.', 'INVALID_ACTION', true);
  }
};

export default execute;
