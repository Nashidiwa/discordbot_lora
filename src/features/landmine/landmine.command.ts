import {
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { AppError } from '../../core/errors.js';
import type { BotCommand } from '../../core/types/index.js';
import { getUserLocale } from '../../shared/utils/i18n.util.js';
import { landmineLocale } from './landmine.locale.js';
import landmineChannelsSub from './subcommands/landmine-channels.sub.js';
import landmineCreateSub from './subcommands/landmine-create.sub.js';
import landmineDeleteSub from './subcommands/landmine-delete.sub.js';
import landmineEditSub from './subcommands/landmine-edit.sub.js';
import landmineLeaderboardSub from './subcommands/landmine-leaderboard.sub.js';
import landmineListSub from './subcommands/landmine-list.sub.js';
import landmineLocaleSub from './subcommands/landmine-locale.sub.js';
import landmineResetSub from './subcommands/landmine-reset.sub.js';
import landmineRolesSub from './subcommands/landmine-roles.sub.js';
import landmineToggleSub from './subcommands/landmine-toggle.sub.js';

const data = new SlashCommandBuilder()
  .setName('landmine')
  .setDescription('Tính năng bẫy chat cấm chat (Landmine Chat Engine)')
  .setDMPermission(false)
  // 1. Lệnh xem danh sách
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('Xem danh sách tất cả các module mìn trong máy chủ'),
  )
  // 2. Lệnh xem bảng xếp hạng
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription('Xem bảng xếp hạng dẫm mìn của máy chủ')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription(
            'Phạm vi BXH (server hoặc mã module như foundation, advanced, M1..M10)',
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('sort')
          .setDescription('Tiêu chí sắp xếp BXH')
          .setRequired(false)
          .addChoices(
            { name: 'Theo tổng số lần dẫm (count - Mặc định)', value: 'count' },
            { name: 'Theo tổng thời gian phạt (duration)', value: 'duration' },
          ),
      ),
  )
  // 3. Lệnh bật/tắt module
  .addSubcommand((sub) =>
    sub
      .setName('toggle')
      .setDescription('(Admin) Bật hoặc tắt nhanh một module mìn')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription('Mã module (foundation, advanced, M1..M10)')
          .setRequired(true),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('state')
          .setDescription('Trạng thái: Bật (True) hoặc Tắt (False)')
          .setRequired(true),
      ),
  )
  // 4. Lệnh tạo custom module mới
  .addSubcommand((sub) =>
    sub
      .setName('create')
      .setDescription('(Admin) Tạo một custom module mìn mới (M3..M10)')
      .addNumberOption((opt) =>
        opt
          .setName('rate')
          .setDescription('Tỉ lệ % phát nổ (ví dụ: 0.8 hoặc 1.5)')
          .setMinValue(0.01)
          .setMaxValue(100)
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('duration')
          .setDescription('Thời gian phạt (ví dụ: 60s, 5m, 1h)')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('note')
          .setDescription('Tên gợi nhớ nội bộ cho module')
          .setRequired(false),
      ),
  )
  // 5. Lệnh xóa custom module
  .addSubcommand((sub) =>
    sub
      .setName('delete')
      .setDescription('(Admin) Xóa vĩnh viễn một custom module mìn (M3..M10)')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription('Mã custom module cần xóa (M3..M10)')
          .setRequired(true),
      ),
  )
  // 6. Lệnh cấu hình chi tiết module
  .addSubcommand((sub) =>
    sub
      .setName('edit')
      .setDescription('(Admin) Chỉnh sửa cấu hình chi tiết của một module mìn')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription('Mã module cần sửa (foundation, advanced, M1..M10)')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('note')
          .setDescription('Tên gợi nhớ')
          .setRequired(false),
      )
      .addNumberOption((opt) =>
        opt
          .setName('rate')
          .setDescription('Tỉ lệ % nổ (chỉ áp dụng cho custom module)')
          .setMinValue(0.01)
          .setMaxValue(100)
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('duration')
          .setDescription(
            'Thời gian phạt (chỉ áp dụng cho custom module, ví dụ: 60s, 5m)',
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('channel_scope')
          .setDescription('Chế độ lọc kênh')
          .setRequired(false)
          .addChoices(
            { name: 'Tất cả các kênh (ALL)', value: 'ALL' },
            { name: 'Chỉ áp dụng (whitelist)', value: 'WHITELIST' },
            { name: 'Loại trừ / Miễn trừ (blacklist)', value: 'BLACKLIST' },
          ),
      )
      .addStringOption((opt) =>
        opt
          .setName('role_scope')
          .setDescription('Chế độ lọc vai trò')
          .setRequired(false)
          .addChoices(
            { name: 'Tất cả thành viên (ALL)', value: 'ALL' },
            { name: 'Chỉ áp dụng (whitelist)', value: 'WHITELIST' },
            { name: 'Miễn trừ / Bỏ qua (blacklist)', value: 'BLACKLIST' },
          ),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('leaderboard')
          .setDescription('Tính vào bảng xếp hạng toàn server')
          .setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('autodelete')
          .setDescription('Tự động xóa tin nhắn thông báo sau 15 giây')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('success_msg')
          .setDescription(
            'Câu thông báo khi nổ thành công (@user). Nhập "default" để xóa.',
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('failed_msg')
          .setDescription(
            'Câu thông báo khi nổ thất bại (@user). Nhập "default" để xóa.',
          )
          .setRequired(false),
      ),
  )
  // 7. Lệnh cấu hình phạm vi kênh
  .addSubcommand((sub) =>
    sub
      .setName('channels')
      .setDescription('(Admin) Cấu hình phạm vi kênh áp dụng của module')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription('Mã module (foundation, advanced, M1..M10)')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Chế độ áp dụng kênh')
          .setRequired(true)
          .addChoices(
            { name: 'Tất cả các kênh (ALL)', value: 'ALL' },
            {
              name: 'Chỉ áp dụng các kênh này (WHITELIST)',
              value: 'WHITELIST',
            },
            {
              name: 'Bỏ qua / Loại trừ các kênh này (BLACKLIST)',
              value: 'BLACKLIST',
            },
          ),
      )
      .addStringOption((opt) =>
        opt
          .setName('channels')
          .setDescription(
            'Danh sách kênh (tag #kênh hoặc ID, cách nhau bởi dấu phẩy/khoảng trắng)',
          )
          .setRequired(false),
      ),
  )
  // 8. Lệnh cấu hình phạm vi vai trò
  .addSubcommand((sub) =>
    sub
      .setName('roles')
      .setDescription('(Admin) Cấu hình phạm vi vai trò áp dụng/miễn trừ của module')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription('Mã module (foundation, advanced, M1..M10)')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Chế độ áp dụng vai trò')
          .setRequired(true)
          .addChoices(
            { name: 'Tất cả thành viên (ALL)', value: 'ALL' },
            {
              name: 'Chỉ áp dụng các vai trò này (WHITELIST)',
              value: 'WHITELIST',
            },
            {
              name: 'Miễn trừ / Bỏ qua các vai trò này (BLACKLIST)',
              value: 'BLACKLIST',
            },
          ),
      )
      .addStringOption((opt) =>
        opt
          .setName('roles')
          .setDescription(
            'Danh sách vai trò (tag @role hoặc ID, cách nhau bởi dấu phẩy/khoảng trắng)',
          )
          .setRequired(false),
      ),
  )
  // 9. Lệnh cài đặt ngôn ngữ bắt buộc
  .addSubcommand((sub) =>
    sub
      .setName('set_locale')
      .setDescription(
        '(Admin) Cấu hình ngôn ngữ hiển thị Embed thông báo nổ mìn',
      )
      .addStringOption((opt) =>
        opt
          .setName('locale')
          .setDescription('Chế độ ngôn ngữ')
          .setRequired(true)
          .addChoices(
            { name: 'Tiếng Việt (vi)', value: 'vi' },
            { name: 'English (en)', value: 'en' },
            { name: 'Tự động theo nạn nhân (auto)', value: 'auto' },
          ),
      ),
  )
  // 10. Lệnh reset thống kê
  .addSubcommand((sub) =>
    sub
      .setName('reset_stats')
      .setDescription('(Admin) Xóa trắng số liệu bảng xếp hạng dẫm mìn')
      .addStringOption((opt) =>
        opt
          .setName('module')
          .setDescription(
            'Mã module (foundation, advanced, M1..M10) hoặc all',
          )
          .setRequired(true),
      ),
  );

export const command: BotCommand = {
  data,
  execute: async (
    interaction: ChatInputCommandInteraction,
  ): Promise<void> => {
    const sub = interaction.options.getSubcommand();

    const isPublic = sub === 'list' || sub === 'leaderboard';
    if (!interaction.deferred && !interaction.replied) {
      if (isPublic) {
        await interaction.deferReply();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
    }

    // Bảo vệ tập trung: Chỉ Server Administrator được dùng các lệnh quản trị
    if (
      !isPublic &&
      !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
    ) {
      const locale = await getUserLocale({
        locale: interaction.locale,
        guildId: interaction.guildId,
      });
      const t = landmineLocale[locale];
      throw new AppError(t.ADMIN_ONLY, 'ADMIN_ONLY', true);
    }

    switch (sub) {
      case 'list':
        await landmineListSub(interaction);
        return;
      case 'leaderboard':
        await landmineLeaderboardSub(interaction);
        return;
      case 'toggle':
        await landmineToggleSub(interaction);
        return;
      case 'create':
        await landmineCreateSub(interaction);
        return;
      case 'delete':
        await landmineDeleteSub(interaction);
        return;
      case 'edit':
        await landmineEditSub(interaction);
        return;
      case 'channels':
      case 'set_channels':
        await landmineChannelsSub(interaction);
        return;
      case 'roles':
      case 'set_roles':
        await landmineRolesSub(interaction);
        return;
      case 'locale':
      case 'set_locale':
        await landmineLocaleSub(interaction);
        return;
      case 'reset':
      case 'reset_stats':
        await landmineResetSub(interaction);
        return;
    }
  },
};

export default command;
