import {
  type ChatInputCommandInteraction,
  type GuildMember,
  PermissionFlagsBits,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { EmbedColor } from '../../../../shared/constants/colors.js';
import {
  createBaseEmbed,
  createErrorEmbed,
} from '../../../../shared/utils/embed.util.js';
import { perksLocale } from '../../common/perks.locale.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const targetUser = interaction.options.getUser('user');
  let targetMember: GuildMember;

  if (targetUser && targetUser.id !== interaction.user.id) {
    const member = interaction.member as GuildMember;
    if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const errEmbed = createErrorEmbed(perksLocale.vi.PERMISSION_DENIED);
      await interaction.editReply({ embeds: [errEmbed] });
      return;
    }

    const fetchedMember = await interaction.guild?.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!fetchedMember) {
      const errEmbed = createErrorEmbed('Không tìm thấy member trong server.');
      await interaction.editReply({ embeds: [errEmbed] });
      return;
    }
    targetMember = fetchedMember;
  } else {
    targetMember = interaction.member as GuildMember;
  }

  const perk = await boosterPerkService.getPerk(
    interaction.guildId!,
    targetMember.id,
  );

  if (!perk) {
    const embed = createBaseEmbed({
      title: `🎨 Custom Role - ${targetMember.displayName}`,
      description: 'User này chưa tạo Custom Role.',
    });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const roleMention = perk.roleId ? `<@&${perk.roleId}>` : 'Chưa gán';

  const embed = createBaseEmbed({
    title: `🎨 Chi Tiết Custom Role - ${targetMember.displayName}`,
    description: `Thông tin chi tiết về Custom Role của ${targetMember}:`,
  }).addFields(
    {
      name: '🏷️ Role',
      value: roleMention,
      inline: true,
    },
    {
      name: '📝 Tên Role',
      value: perk.roleName ?? 'Chưa đặt',
      inline: true,
    },
    {
      name: '🎨 Mã Màu',
      value: `\`${perk.roleColor ?? 'Mặc định'}\`${perk.roleColor2 ? ` / \`${perk.roleColor2}\`` : ''}`,
      inline: true,
    },
    {
      name: '📌 Trạng Thái',
      value: `**${perk.status}**`,
      inline: true,
    },
    {
      name: '🛡️ Đang Trang Bị',
      value: perk.isEquipped ? '✅ Đang đeo' : '❌ Đã tháo (Unclaimed)',
      inline: true,
    },
    {
      name: '🚀 Số Lượt Boost',
      value: `**${perk.boostCount}** boost(s)`,
      inline: true,
    },
  );

  if (perk.status === 'GRACE_PERIOD' && perk.gracePeriodExpiresAt) {
    const isSelf = targetMember.id === interaction.user.id;
    const ownerWarning = isSelf
      ? `Custom Role của bạn sẽ bị thu hồi vĩnh viễn vào <t:${Math.floor(perk.gracePeriodExpiresAt.getTime() / 1000)}:F> (<t:${Math.floor(perk.gracePeriodExpiresAt.getTime() / 1000)}:R>). Hãy boost lại máy chủ để tiếp tục duy trì perk.`
      : `Custom Role của ${targetMember.displayName} sẽ bị thu hồi vĩnh viễn vào <t:${Math.floor(perk.gracePeriodExpiresAt.getTime() / 1000)}:F> (<t:${Math.floor(perk.gracePeriodExpiresAt.getTime() / 1000)}:R>).`;

    embed.setColor(EmbedColor.WARNING);
    embed.setDescription(
      `⚠️ **NHẮC NHỞ: Role đang trong thời gian ân hạn.**\n${ownerWarning}\n\nThông tin chi tiết về Custom Role của ${targetMember}:`,
    );
  }

  if (perk.gracePeriodExpiresAt) {
    embed.addFields({
      name: '⏳ Hạn Ân Hạn',
      value: `<t:${Math.floor(perk.gracePeriodExpiresAt.getTime() / 1000)}:R>`,
      inline: false,
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
