import {
  type ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';
import { boosterPerkService } from '../../booster/services/booster-perk.service.js';
import { formatDurationVietnamese } from '../../donator/donator.utils.js';
import { donatorPerkService } from '../../donator/services/donator-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const member =
    interaction.member instanceof GuildMember
      ? interaction.member
      : await interaction.guild!.members.fetch(interaction.user.id);
  const perk = await boosterPerkService.getPerk(
    interaction.guildId!,
    member.id,
  );

  const isBooster = Boolean(
    member.premiumSince || (perk && perk.boostCount > 0),
  );

  const isGracePeriod = perk?.status === 'GRACE_PERIOD';
  const boosterStatusText = isBooster
    ? 'Đang kích hoạt'
    : isGracePeriod
      ? 'Đang trong ân hạn'
      : 'Chưa kích hoạt';

  const displayBoostCount = perk?.boostCount ?? (isBooster ? 1 : 0);

  // Trạng thái ngắn gọn của Custom Role
  let roleStatusSummary = 'Chưa mở khóa';
  if (perk && perk.roleId) {
    roleStatusSummary = perk.isEquipped
      ? `<@&${perk.roleId}> (Đang trang bị)`
      : `<@&${perk.roleId}> (Đã tạm tháo)`;
  } else if (isBooster) {
    roleStatusSummary = 'Chưa tạo (`/perk server_booster role_claim`)';
  }

  // Nội dung field gọn gàng cho Server Booster
  const boosterLines = [
    `• Trạng thái: **${boosterStatusText}** (${displayBoostCount} lượt boost)`,
    `• Custom Role: ${roleStatusSummary}`,
  ];

  if (perk?.gracePeriodExpiresAt) {
    boosterLines.push(
      `• Hạn ân hạn: <t:${Math.floor(perk.gracePeriodExpiresAt.getTime() / 1000)}:R> (Role sẽ bị xóa nếu không re-boost)`,
    );
  }

  boosterLines.push('*💡 Dùng `/perk server_booster role_view` để xem chi tiết role.*');

  const embed = createBaseEmbed({
    title: `📊 Trạng Thái Quyền Lợi - ${member.displayName}`,
    description: 'Tổng quan các đặc quyền của bạn tại server:',
  }).addFields({
    name: '🚀 1. Server Booster',
    value: boosterLines.join('\n'),
  });

  // Kiểm tra quyền lợi Donator nếu người dùng có credit
  const donatorStatus = await donatorPerkService.getAccountStatus(
    interaction.guildId!,
    member.id,
  );

  if (donatorStatus && donatorStatus.creditSeconds > 0) {
    let donatorStatusText = 'Tạm gỡ (0.2x)';
    if (!donatorStatus.isEnabled) {
      donatorStatusText = 'Đang đóng băng (0.0x)';
    } else if (donatorStatus.isEquipped) {
      donatorStatusText = 'Đang trang bị (1.0x)';
    }

    const donatorLines = [
      `• Trạng thái: **${donatorStatusText}**`,
      `• Quỹ thời gian: **${formatDurationVietnamese(donatorStatus.creditSeconds)}**`,
      `• Chuỗi Streak: **${donatorStatus.streak} tuần**`,
    ];

    if (donatorStatus.isEnabled && donatorStatus.estimatedDepletionDate) {
      donatorLines.push(
        `• Dự kiến cạn quỹ: <t:${Math.floor(donatorStatus.estimatedDepletionDate.getTime() / 1000)}:R>`,
      );
    }

    donatorLines.push(
      '*💡 Dùng `/perk donator status` để xem chi tiết hoặc `/perk donator equip`/`unequip` để quản lý.*',
    );

    embed.addFields({
      name: '💎 2. Donator Status',
      value: donatorLines.join('\n'),
    });
  }

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
