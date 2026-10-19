import {
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

const data = new SlashCommandBuilder()
  .setName('perk')
  .setDescription('Hệ thống quản lý quyền lợi máy chủ (Server Perks)')
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
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    // 2.5s rule: Acknowledge upfront with non-deprecated MessageFlags
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
  },
};

export default command;
