import type {
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createBaseEmbed } from '../../../../shared/utils/embed.util.js';
import { boosterPerkService } from '../../booster/services/booster-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const member = interaction.member as GuildMember;
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
    description: 'Tổng quan các gói quyền lợi của bạn tại máy chủ:',
  }).addFields({
    name: '🚀 1. Server Booster',
    value: boosterLines.join('\n'),
  });

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
