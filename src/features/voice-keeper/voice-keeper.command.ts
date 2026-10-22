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
    'Hệ thống duy trì kết nối kênh thoại 24/7 và tự phục hồi (Voice Keeper)',
  )
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Thiết lập và kích hoạt giữ kênh thoại 24/7 cho máy chủ')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Kênh thoại cần giữ kết nối 24/7')
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
            'Tự động điếc bot để tiết kiệm băng thông (Mặc định: Bật)',
          )
          .setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('self_mute')
          .setDescription(
            'Tự động tắt mic bot để tránh phát âm thanh (Mặc định: Bật)',
          )
          .setRequired(false),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('auto_reconnect')
          .setDescription(
            'Tự động kết nối lại khi bị kick hoặc rớt mạng (Mặc định: Bật)',
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('status')
      .setDescription('Xem trạng thái kết nối Voice Keeper 24/7 của máy chủ'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('reconnect')
      .setDescription(
        'Ép kết nối lại kênh thoại Voice Keeper 24/7 ngay lập tức',
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('stop')
      .setDescription('Dừng giữ kênh thoại 24/7 và ngắt kết nối bot'),
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
          content: 'Lệnh không hợp lệ.',
          flags: MessageFlags.Ephemeral,
        });
        break;
    }
  },
};

export default command;
