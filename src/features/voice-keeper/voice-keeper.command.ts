import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import reconnectSub from './subcommands/reconnect.sub.js';
import setSub from './subcommands/set.sub.js';
import statusSub from './subcommands/status.sub.js';
import stopSub from './subcommands/stop.sub.js';

const data = new SlashCommandBuilder()
  .setName('voice_keeper')
  .setDescription(
    'Tính năng duy trì và tự phục hồi kết nối voice channel 24/7.',
  )
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Thiết lập và cấu hình giữ kênh thoại 24/7 cho một voice channel xác định trong server.')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Voice channel mục tiêu (cần giữ kết nối 24/7).')
          .addChannelTypes(
            ChannelType.GuildVoice,
            ChannelType.GuildStageVoice,
          )
          .setRequired(true),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('self_deaf')
          .setDescription(
            'Tắt nghe của bot để đảm bảo riêng tư và tiết kiệm băng thông (Mặc định: BẬT).',
          )
          .setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('self_mute')
          .setDescription(
            'Tắt mic của bot để đảm bảo riêng tư và tiết kiệm băng thông (Mặc định: BẬT).',
          )
          .setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('auto_reconnect')
          .setDescription(
            'Tự động kết nối lại khi bị kick ngoài ý muốn hoặc kết nối không ổn định (Mặc định: BẬT).',
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('status')
      .setDescription('Xem trạng thái voice keeper của server.'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('reconnect')
      .setDescription(
        'Gửi yêu cầu buộc thiết lập lại kết nối.',
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('stop')
      .setDescription('Dừng cấu hình voice keeper và đóng kết nối ngay lập tức.'),
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'set':
        await setSub(interaction);
        break;
      case 'status':
        await statusSub(interaction);
        break;
      case 'reconnect':
        await reconnectSub(interaction);
        break;
      case 'stop':
        await stopSub(interaction);
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
