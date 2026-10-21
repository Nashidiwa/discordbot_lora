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
  .setDescription('Hệ thống quản lý vai trò liên kết Discord Linked Roles (The Swarm)')
  .setDMPermission(true)
  // 1. Top-level Subcommands
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Gán cấp độ The Swarm (1 - 8) cho thành viên (Operator Only)')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Thành viên cần gán cấp độ')
          .setRequired(true),
      )
      .addIntegerOption((opt) =>
        opt
          .setName('level')
          .setDescription('Cấp độ Swarm từ 1 đến 8')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(8),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Thu hồi cấp độ The Swarm của thành viên (Operator Only)')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Thành viên cần thu hồi cấp độ')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('status')
      .setDescription('Tra cứu trạng thái cấp độ Swarm và tình trạng kết nối Discord')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Thành viên cần tra cứu (để trống để xem bản thân)')
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('link')
      .setDescription('Nhận liên kết xác thực Discord OAuth2 để kích hoạt Linked Role'),
  )
  // 2. Subcommand Group: delegate (Bot Owner Only)
  .addSubcommandGroup((group) =>
    group
      .setName('delegate')
      .setDescription('Quản lý danh sách Delegated Operators (Bot Owner Only)')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Ủy quyền quyền hạn Operator cho một thành viên')
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên cần ủy quyền')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('remove')
          .setDescription('Hủy quyền Operator của một thành viên')
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Thành viên cần hủy quyền')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('list')
          .setDescription('Xem danh sách tất cả các Operator đang được ủy quyền'),
      ),
  )
  // 3. Subcommand Group: channel (Operator Only)
  .addSubcommandGroup((group) =>
    group
      .setName('channel')
      .setDescription('Cấu hình kênh thông báo thăng cấp/thu hồi Swarm (Operator Only)')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Chỉ định kênh nhận thông báo thăng cấp/thu hồi Swarm')
          .addChannelOption((opt) =>
            opt
              .setName('channel')
              .setDescription('Kênh văn bản nhận thông báo')
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
          .setDescription('Hủy kênh thông báo Swarm của máy chủ hiện tại'),
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
          content: 'Lệnh không hợp lệ.',
          flags: MessageFlags.Ephemeral,
        });
        break;
    }
  },
};

export default command;
