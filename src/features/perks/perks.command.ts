import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import boosterClaimSub from './booster/subcommands/booster-claim.sub.js';
import boosterConfigSub from './booster/subcommands/booster-config.sub.js';
import boosterInfoSub from './booster/subcommands/booster-info.sub.js';
import boosterSetBoostSub from './booster/subcommands/booster-setboost.sub.js';
import boosterUnclaimSub from './booster/subcommands/booster-unclaim.sub.js';
import boosterViewSub from './booster/subcommands/booster-view.sub.js';
import listSub from './common/subcommands/list.sub.js';
import statusSub from './common/subcommands/status.sub.js';
import donatorAddSub from './donator/subcommands/donator-add.sub.js';
import donatorAdjustSub from './donator/subcommands/donator-adjust.sub.js';
import donatorConfigSub from './donator/subcommands/donator-config.sub.js';
import donatorEquipSub from './donator/subcommands/donator-equip.sub.js';
import donatorInfoSub from './donator/subcommands/donator-info.sub.js';
import donatorSetStreakSub from './donator/subcommands/donator-setstreak.sub.js';
import donatorStatusSub from './donator/subcommands/donator-status.sub.js';
import donatorToggleSub from './donator/subcommands/donator-toggle.sub.js';
import donatorUnequipSub from './donator/subcommands/donator-unequip.sub.js';

const data = new SlashCommandBuilder()
  .setName('perk')
  .setDescription('Hệ thống quản lý quyền lợi máy chủ (Server Perks)')
  .setDMPermission(false)
  // 1. Top-level Subcommands
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('Xem danh sách tất cả các gói quyền lợi của máy chủ'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('status')
      .setDescription('Xem trạng thái các quyền lợi hiện tại của bạn'),
  )
  // 2. Subcommand Group: server_booster
  .addSubcommandGroup((group) =>
    group
      .setName('server_booster')
      .setDescription('Quản lý quyền lợi dành riêng cho Server Booster')
      .addSubcommand((sub) =>
        sub
          .setName('info')
          .setDescription(
            'Xem chi tiết chính sách và đặc quyền cho Server Booster',
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('role_view')
          .setDescription(
            'Xem thông tin chi tiết Custom Role của bạn hoặc thành viên khác',
          )
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên cần xem (chỉ Staff mới được xem người khác)')
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('role_claim')
          .setDescription('Tạo mới hoặc trang bị lại Custom Role của bạn'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('role_unclaim')
          .setDescription(
            'Tạm tháo Custom Role của bạn (role không bị xóa khỏi server)',
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('role_config')
          .setDescription('Cập nhật tên và màu sắc cho Custom Role của bạn')
          .addStringOption((opt) =>
            opt
              .setName('name')
              .setDescription('Tên mới cho role của bạn')
              .setRequired(false),
          )
          .addStringOption((opt) =>
            opt
              .setName('color1')
              .setDescription('Mã màu Hex chính (ví dụ: #FF5733 hoặc FF5733)')
              .setRequired(false),
          )
          .addStringOption((opt) =>
            opt
              .setName('color2')
              .setDescription(
                'Mã màu thứ 2 (đặc quyền gradient dành riêng cho 2+ boosts)',
              )
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('set_boost')
          .setDescription('(Admin) Đồng bộ số lượt boost của thành viên')
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên cần đồng bộ số lượt boost')
              .setRequired(true),
          )
          .addIntegerOption((opt) =>
            opt
              .setName('count')
              .setDescription('Số lượt boost thực tế (tối thiểu 0)')
              .setMinValue(0)
              .setRequired(true),
          ),
      ),
  )
  // 3. Subcommand Group: donator
  .addSubcommandGroup((group) =>
    group
      .setName('donator')
      .setDescription(
        'Quản lý quyền lợi và quỹ thời gian dành cho Donator (Người ủng hộ)',
      )
      .addSubcommand((sub) =>
        sub
          .setName('info')
          .setDescription(
            'Xem chính sách, biểu phí quy đổi, bảng thưởng Volume & Streak',
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('status')
          .setDescription(
            'Xem số dư credit, trạng thái trang bị và chuỗi streak của bạn',
          )
          .addUserOption((opt) =>
            opt
              .setName('member')
              .setDescription(
                'Thành viên cần tra cứu (chỉ Admin mới được xem người khác)',
              )
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('equip')
          .setDescription(
            'Lấy Role Donator ra đeo - kích hoạt tốc độ tiêu hao 1.0x',
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unequip')
          .setDescription(
            'Cất Role Donator vào kho - kích hoạt tốc độ tiết kiệm 0.2x',
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription(
            '(Admin) Ghi nhận ủng hộ, áp dụng thưởng kép và tự động cấp Role',
          )
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên ủng hộ')
              .setRequired(true),
          )
          .addIntegerOption((opt) =>
            opt
              .setName('amount')
              .setDescription('Số tiền ủng hộ (VNĐ, tối thiểu 1)')
              .setMinValue(1)
              .setRequired(true),
          )
          .addStringOption((opt) =>
            opt
              .setName('note')
              .setDescription('Ghi chú giao dịch')
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('adjust')
          .setDescription(
            '(Admin) Điều chỉnh tăng/giảm thời gian credit của thành viên',
          )
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên cần điều chỉnh')
              .setRequired(true),
          )
          .addIntegerOption((opt) =>
            opt
              .setName('seconds')
              .setDescription(
                'Số giây điều chỉnh (+ để cộng, - để trừ credit)',
              )
              .setRequired(true),
          )
          .addStringOption((opt) =>
            opt
              .setName('reason')
              .setDescription('Lý do điều chỉnh')
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('set_streak')
          .setDescription(
            '(Admin) Điều chỉnh bậc chuỗi tuần (Streak) của thành viên',
          )
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên cần điều chỉnh streak')
              .setRequired(true),
          )
          .addIntegerOption((opt) =>
            opt
              .setName('streak')
              .setDescription('Bậc streak mới (0 đến 100)')
              .setMinValue(0)
              .setMaxValue(100)
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('config')
          .setDescription('(Admin) Cấu hình hệ thống Donator Perk của máy chủ')
          .addStringOption((opt) =>
            opt
              .setName('action')
              .setDescription('Hành động cấu hình (view, set_role, set_channel)')
              .setRequired(true)
              .addChoices(
                { name: 'Xem cấu hình hiện tại (view)', value: 'view' },
                { name: 'Gán Role Donator (set_role)', value: 'set_role' },
                {
                  name: 'Gán hoặc xóa Kênh thông báo (set_channel)',
                  value: 'set_channel',
                },
              ),
          )
          .addRoleOption((opt) =>
            opt
              .setName('role')
              .setDescription(
                'Role Donator cần gán (bắt buộc khi action là set_role)',
              )
              .setRequired(false),
          )
          .addChannelOption((opt) =>
            opt
              .setName('channel')
              .setDescription(
                'Kênh thông báo (bỏ trống để xóa nếu action là set_channel)',
              )
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
              )
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('toggle')
          .setDescription('(Admin) Bật hoặc tắt tính năng Donator Perk')
          .addBooleanOption((opt) =>
            opt
              .setName('state')
              .setDescription('Trạng thái: Bật (True) hoặc Tắt (False)')
              .setRequired(true),
          ),
      ),
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    // 2.5s rule: Acknowledge upfront with non-deprecated MessageFlags
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply({
        content: 'Lệnh này chỉ có thể sử dụng bên trong máy chủ (Guild).',
      });
      return;
    }

    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (!group) {
      if (sub === 'list') {
        await listSub(interaction);
        return;
      }
      if (sub === 'status') {
        await statusSub(interaction);
        return;
      }
    }

    if (group === 'server_booster') {
      switch (sub) {
        case 'info':
          await boosterInfoSub(interaction);
          return;
        case 'role_view':
          await boosterViewSub(interaction);
          return;
        case 'role_claim':
          await boosterClaimSub(interaction);
          return;
        case 'role_unclaim':
          await boosterUnclaimSub(interaction);
          return;
        case 'role_config':
          await boosterConfigSub(interaction);
          return;
        case 'set_boost':
          await boosterSetBoostSub(interaction);
          return;
      }
    }

    if (group === 'donator') {
      switch (sub) {
        case 'info':
          await donatorInfoSub(interaction);
          return;
        case 'status':
          await donatorStatusSub(interaction);
          return;
        case 'equip':
          await donatorEquipSub(interaction);
          return;
        case 'unequip':
          await donatorUnequipSub(interaction);
          return;
        case 'add':
          await donatorAddSub(interaction);
          return;
        case 'adjust':
          await donatorAdjustSub(interaction);
          return;
        case 'set_streak':
        case 'setstreak':
          await donatorSetStreakSub(interaction);
          return;
        case 'config':
          await donatorConfigSub(interaction);
          return;
        case 'toggle':
          await donatorToggleSub(interaction);
          return;
      }
    }
  },
};

export default command;
