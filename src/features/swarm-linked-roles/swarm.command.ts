import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import channelSub from './subcommands/channel.sub.js';
import delegateSub from './subcommands/delegate.sub.js';
import linkSub from './subcommands/link.sub.js';
import removeSub from './subcommands/remove.sub.js';
import setSub from './subcommands/set.sub.js';
import statusSub from './subcommands/status.sub.js';

const data = new SlashCommandBuilder()
  .setName('swarm')
  .setDescription('Tính năng quản lý Linked Roles: The Swarm')
  .setDMPermission(true)
  // 1. Top-level Subcommands
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Cấp đặc quyền đeo linked role The Swarm cho member (Operator Only)')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Member mục tiêu')
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName('level')
          .setDescription('Phân cấp mục tiêu')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(8),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Thu hồi đặc quyền đeo linked role The Swarm cho member (Operator Only)')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Member mục tiêu')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('status')
      .setDescription('Kiểm tra đặc quyền linked role The Swarm và trạng thái liên kết Discord')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Member mục tiêu')
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('link')
      .setDescription('Nhận liên kết ủy quyền OAuth2 để được cập nhật metadata'),
  )
  // 2. Subcommand Group: delegate (Bot Owner Only)
  .addSubcommandGroup((group) =>
    group
      .setName('delegate')
      .setDescription('Quản lý Delegated Operators (Owner)')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Ủy quyền quyền hạn Operator cho member')
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Member mục tiêu được ủy quyền')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Thu hồi quyền hạn Operator của member')
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Member mục tiêu cần thu hồi quyền hạn')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('list')
          .setDescription('Xem danh sách tất cả Operator đang được ủy quyền'),
      ),
  )
  // 3. Subcommand Group: channel (Operator Only)
  .addSubcommandGroup((group) =>
    group
      .setName('channel')
      .setDescription('Cấu hình kênh thông báo nâng bậc/thu hồi linked role The Swarm (Operator Only)')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Chỉ định channel mục tiêu nhận thông báo nâng bậc/thu hồi linked role The Swarm')
          .addChannelOption((opt) =>
            opt
              .setName('channel')
              .setDescription('Channel mục tiêu')
              .addChannelTypes(
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
              )
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Hủy channel nhận thông báo của server này'),
      ),
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (group === 'delegate') {
      await delegateSub(interaction);
      return;
    }

    if (group === 'channel') {
      await channelSub(interaction);
      return;
    }

    switch (subcommand) {
      case 'set':
        await setSub(interaction);
        break;
      case 'remove':
        await removeSub(interaction);
        break;
      case 'status':
        await statusSub(interaction);
        break;
      case 'link':
        await linkSub(interaction);
        break;
      default:
        await interaction.reply({
          content: 'Yêu cầu không hợp lệ.',
          flags: MessageFlags.Ephemeral,
        });
        break;
    }
  },
};

export default command;
