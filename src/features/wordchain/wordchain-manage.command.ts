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
  .setDescription('Quản trị và cấu hình trò chơi Word Chain cho máy chủ')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  // 1. Group: channel
  .addSubcommandGroup((group) =>
    group
      .setName('channel')
      .setDescription('Cấu hình kênh trò chơi')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Gán kênh hoạt động cho chế độ chơi')
          .addChannelOption((opt) =>
            opt
              .setName('channel')
              .setDescription('Kênh văn bản dùng để chơi nối từ')
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          )
          .addStringOption((opt) =>
            opt
              .setName('mode')
              .setDescription('Chế độ chơi (Normal: 1 chữ cái, Hard: 2 chữ cái)')
              .addChoices(
                { name: 'Normal Mode (1 chữ cái)', value: 'normal' },
                { name: 'Hard Mode (2 chữ cái)', value: 'hard' },
              )
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unset')
          .setDescription('Hủy kích hoạt kênh chơi cho chế độ được chọn')
          .addStringOption((opt) =>
            opt
              .setName('mode')
              .setDescription('Chế độ chơi cần hủy kênh')
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
      .setDescription('Cấu hình vai trò tự động (Reliable / Failed)')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Gán vai trò cho người chơi uy tín hoặc người phá chuỗi')
          .addStringOption((opt) =>
            opt
              .setName('type')
              .setDescription('Loại vai trò cần thiết lập')
              .addChoices(
                { name: 'Reliable Role (Người chơi uy tín)', value: 'reliable' },
                { name: 'Failed Role (Người làm đứt chuỗi)', value: 'failed' },
              )
              .setRequired(true),
          )
          .addRoleOption((opt) =>
            opt
              .setName('role')
              .setDescription('Vai trò trong máy chủ')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unset')
          .setDescription('Hủy gán vai trò')
          .addStringOption((opt) =>
            opt
              .setName('type')
              .setDescription('Loại vai trò cần hủy')
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
      .setDescription('Quản lý ngôn ngữ chơi trong máy chủ')
      .addSubcommand((sub) =>
        sub
          .setName('show-all')
          .setDescription('Hiển thị tất cả ngôn ngữ được hỗ trợ và trạng thái kích hoạt'),
      )
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Kích hoạt thêm ngôn ngữ chơi (tối đa 2 ngôn ngữ)')
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
          .setDescription('Tắt một ngôn ngữ chơi (phải giữ lại ít nhất 1 ngôn ngữ)')
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
      .setDescription('Quản lý danh sách từ cấm riêng của máy chủ')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Thêm từ vào danh sách đen (sẽ bị loại bỏ khi chơi)')
          .addStringOption((opt) =>
            opt
              .setName('word')
              .setDescription('Từ tiếng Anh cần cấm')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Gỡ từ khỏi danh sách đen')
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
          .setDescription('Hiển thị tất cả các từ trong danh sách đen'),
      ),
  )
  // 5. Group: whitelist
  .addSubcommandGroup((group) =>
    group
      .setName('whitelist')
      .setDescription('Quản lý danh sách từ cho phép (bỏ qua kiểm tra từ điển)')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Thêm từ vào danh sách trắng (luôn được chấp nhận)')
          .addStringOption((opt) =>
            opt
              .setName('word')
              .setDescription('Từ tiếng Anh cần thêm vào whitelist')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Gỡ từ khỏi danh sách trắng')
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
          .setDescription('Hiển thị tất cả các từ trong danh sách trắng'),
      ),
  )
  // 6. Subcommand: reset-stats
  .addSubcommand((sub) =>
    sub
      .setName('reset-stats')
      .setDescription('Xóa toàn bộ điểm số người chơi và kỷ lục chuỗi của máy chủ này'),
  )
  // 7. Group: admin
  .addSubcommandGroup((group) =>
    group
      .setName('admin')
      .setDescription('Các thao tác quản trị cấp cao dành riêng cho Administrator')
      .addSubcommand((sub) =>
        sub
          .setName('purge-user')
          .setDescription('GDPR: Xóa vĩnh viễn toàn bộ dữ liệu của người dùng trên toàn hệ thống')
          .addStringOption((opt) =>
            opt
              .setName('user_id')
              .setDescription('ID người dùng Discord cần xóa dữ liệu')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('purge-server')
          .setDescription('Xóa vĩnh viễn toàn bộ dữ liệu Word Chain của một máy chủ')
          .addStringOption((opt) =>
            opt
              .setName('guild_id')
              .setDescription('ID máy chủ Discord cần xóa')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('ban-member')
          .setDescription('Cấm hoặc gỡ cấm người chơi khỏi hệ thống toàn cầu')
          .addStringOption((opt) =>
            opt
              .setName('user_id')
              .setDescription('ID người dùng Discord')
              .setRequired(true),
          )
          .addBooleanOption((opt) =>
            opt
              .setName('ban')
              .setDescription('True: cấm chơi, False: gỡ cấm')
              .setRequired(false),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('ban-server')
          .setDescription('Cấm hoặc gỡ cấm máy chủ khỏi bảng xếp hạng toàn cầu')
          .addStringOption((opt) =>
            opt
              .setName('guild_id')
              .setDescription('ID máy chủ Discord')
              .setRequired(true),
          )
          .addBooleanOption((opt) =>
            opt
              .setName('ban')
              .setDescription('True: cấm khỏi BXH, False: gỡ cấm')
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
