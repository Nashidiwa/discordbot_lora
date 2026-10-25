import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import channelManageSub from './subcommands/channel-manage.sub.js';
import roleManageSub from './subcommands/role-manage.sub.js';
import languageManageSub from './subcommands/language-manage.sub.js';
import blacklistManageSub from './subcommands/blacklist-manage.sub.js';
import whitelistManageSub from './subcommands/whitelist-manage.sub.js';
import resetStatsSub from './subcommands/reset-stats.sub.js';
import adminManageSub from './subcommands/admin-manage.sub.js';

const data = new SlashCommandBuilder()
  .setName('wordchain-manage')
  .setDescription('Quản trị và cấu hình Word Chain cho server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  // 1. Group: channel
  .addSubcommandGroup((group) =>
    group
      .setName('channel')
      .setDescription('Cấu hình channel chơi Word Chain')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Gán channel cho chơi word Chain (nối từ)')
          .addChannelOption((opt) =>
            opt
              .setName('channel')
              .setDescription('Channel mục tiêu để chơi Word Chain (nối từ)')
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          )
          .addStringOption((opt) =>
            opt
              .setName('mode')
              .setDescription('Chế độ chơi (Normal / Hard)')
              .addChoices(
                { name: 'Normal Mode (nối 1 chữ cái)', value: 'normal' },
                { name: 'Hard Mode (nối 2 chữ cái)', value: 'hard' },
              )
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unset')
          .setDescription('Hủy gán channel cho chế độ chơi được chọn')
          .addStringOption((opt) =>
            opt
              .setName('mode')
              .setDescription('Chế độ chơi cần hủy channel')
              .addChoices(
                { name: 'Normal Mode', value: 'normal' },
                { name: 'Hard Mode', value: 'hard' },
              )
              .setRequired(true),
          ),
      ),
  )
  // 2. Group: role
  .addSubcommandGroup((group) =>
    group
      .setName('role')
      .setDescription('Cấu hình role tự động (Reliable / Failed)')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Gán role cho member uy tín hoặc hay phá chuỗi')
          .addStringOption((opt) =>
            opt
              .setName('type')
              .setDescription('Loại role cần cấu hình')
              .addChoices(
                { name: 'Reliable Role (Player uy tín)', value: 'reliable' },
                { name: 'Failed Role (Player làm đứt chuỗi)', value: 'failed' },
              )
              .setRequired(true),
          )
          .addRoleOption((opt) =>
            opt
              .setName('role')
              .setDescription('Role trong server')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unset')
          .setDescription('Hủy gán role')
          .addStringOption((opt) =>
            opt
              .setName('type')
              .setDescription('Loại role cần hủy')
              .addChoices(
                { name: 'Reliable Role', value: 'reliable' },
                { name: 'Failed Role', value: 'failed' },
              )
              .setRequired(true),
          ),
      ),
  )
  // 3. Group: language
  .addSubcommandGroup((group) =>
    group
      .setName('language')
      .setDescription('Quản lý ngôn ngữ Word Chain trong server')
      .addSubcommand((sub) =>
        sub
          .setName('show-all')
          .setDescription('Xem tất cả ngôn ngữ được hỗ trợ và trạng thái sử dụng'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Thêm ngôn ngữ cho Word Chain (tối đa 2 ngôn ngữ)')
          .addStringOption((opt) =>
            opt
              .setName('language_code')
              .setDescription('Mã ngôn ngữ (ví dụ: en)')
              .setAutocomplete(true)
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Tắt một ngôn ngữ chơi (phải còn lại ít nhất 1 ngôn ngữ)')
          .addStringOption((opt) =>
            opt
              .setName('language_code')
              .setDescription('Mã ngôn ngữ cần tắt')
              .setAutocomplete(true)
              .setRequired(true),
          ),
      ),
  )
  // 4. Group: blacklist
  .addSubcommandGroup((group) =>
    group
      .setName('blacklist')
      .setDescription('Quản lý danh sách từ cấm riêng của server')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Thêm từ vào blacklist (sẽ không được chấp nhận)')
          .addStringOption((opt) =>
            opt
              .setName('word')
              .setDescription('Từ cần cấm')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Gỡ từ khỏi blacklist')
          .addStringOption((opt) =>
            opt
              .setName('word')
              .setDescription('Từ cần gỡ bỏ')
              .setAutocomplete(true)
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('show')
          .setDescription('Xem tất cả các từ được ghi nhận trong blacklist'),
      ),
  )
  // 5. Group: whitelist
  .addSubcommandGroup((group) =>
    group
      .setName('whitelist')
      .setDescription('Quản lý danh sách từ mặc định cho phép (bỏ qua kiểm tra từ điển)')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Thêm từ vào whitelist (luôn được chấp nhận)')
          .addStringOption((opt) =>
            opt
              .setName('word')
              .setDescription('Từ cần thêm vào whitelist')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Gỡ từ khỏi whitelist')
          .addStringOption((opt) =>
            opt
              .setName('word')
              .setDescription('Từ cần gỡ bỏ')
              .setAutocomplete(true)
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('show')
          .setDescription('Xem tất cả các từ được ghi nhận trong whitelist'),
      ),
  )
  // 6. Subcommand: reset-stats
  .addSubcommand((sub) =>
    sub
      .setName('reset-stats')
      .setDescription('Xóa toàn bộ điểm số người chơi và kỷ lục chuỗi của server này'),
  )
  // 7. Group: admin
  .addSubcommandGroup((group) =>
    group
      .setName('admin')
      .setDescription('Thao tác quản trị toàn hệ thống')
      .addSubcommand((sub) =>
        sub
          .setName('purge-user')
          .setDescription('GDPR: Xóa vĩnh viễn toàn bộ dữ liệu user trên toàn hệ thống')
          .addStringOption((opt) =>
            opt
              .setName('user_id')
              .setDescription('userID mục tiêu cần xóa dữ liệu')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('purge-server')
          .setDescription('Xóa vĩnh viễn toàn bộ dữ liệu Word Chain của một server')
          .addStringOption((opt) =>
            opt
              .setName('guild_id')
              .setDescription('Server ID mục tiêu cần xóa dữ liệu')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('ban-member')
          .setDescription('Cấm hoặc gỡ cấm user khỏi toàn hệ thống')
          .addStringOption((opt) =>
            opt
              .setName('user_id')
              .setDescription('userID mục tiêu')
              .setRequired(true),
          )
          .addBooleanOption((opt) =>
            opt
              .setName('ban')
              .setDescription('True: cấm, False: gỡ cấm')
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('ban-server')
          .setDescription('Cấm hoặc gỡ cấm server khỏi global leaderboard')
          .addStringOption((opt) =>
            opt
              .setName('guild_id')
              .setDescription('Server ID mục tiêu')
              .setRequired(true),
          )
          .addBooleanOption((opt) =>
            opt
              .setName('ban')
              .setDescription('True: cấm khỏi leaderboard, False: gỡ cấm')
              .setRequired(false),
          ),
      ),
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subGroup = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (subGroup === 'channel') {
      await channelManageSub(interaction);
      return;
    }

    if (subGroup === 'role') {
      await roleManageSub(interaction);
      return;
    }

    if (subGroup === 'language') {
      await languageManageSub(interaction);
      return;
    }

    if (subGroup === 'blacklist') {
      await blacklistManageSub(interaction);
      return;
    }

    if (subGroup === 'whitelist') {
      await whitelistManageSub(interaction);
      return;
    }

    if (subGroup === 'admin') {
      await adminManageSub(interaction);
      return;
    }

    if (subcommand === 'reset-stats') {
      await resetStatsSub(interaction);
      return;
    }

    await interaction.reply({
      content: 'Lệnh không hợp lệ.',
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
