import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import checkSub from './subcommands/check.sub.js';
import definitionSub from './subcommands/definition.sub.js';
import leaderboardSub from './subcommands/leaderboard.sub.js';
import statsSub from './subcommands/stats.sub.js';
import languagesSub from './subcommands/languages.sub.js';
import helpSub from './subcommands/help.sub.js';

const data = new SlashCommandBuilder()
  .setName('wordchain')
  .setDescription('Trò chơi nối từ thông minh với kiểm tra từ điển và tính điểm Karma')
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('check')
      .setDescription('Kiểm tra tính hợp lệ của một từ trước khi gửi vào kênh chơi')
      .addStringOption((opt) =>
        opt
          .setName('word')
          .setDescription('Từ tiếng Anh cần kiểm tra')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('definition')
      .setDescription('Tra cứu định nghĩa và từ loại trên từ điển Wiktionary')
      .addStringOption((opt) =>
        opt
          .setName('word')
          .setDescription('Từ tiếng Anh cần tra nghĩa')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription('Xem bảng xếp hạng điểm số và Karma của người chơi hoặc máy chủ')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Loại bảng xếp hạng')
          .addChoices(
            { name: 'Người chơi (User)', value: 'user' },
            { name: 'Máy chủ (Server)', value: 'server' },
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('metric')
          .setDescription('Tiêu chí xếp hạng người chơi')
          .addChoices(
            { name: 'Điểm số (Score)', value: 'score' },
            { name: 'Karma hợp tác (Karma)', value: 'karma' },
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('scope')
          .setDescription('Phạm vi xếp hạng người chơi')
          .addChoices(
            { name: 'Trong máy chủ này (Server)', value: 'server' },
            { name: 'Toàn cầu (Global)', value: 'global' },
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Chế độ chơi cho BXH máy chủ')
          .addChoices(
            { name: 'Normal Mode (1 chữ cái)', value: 'normal' },
            { name: 'Hard Mode (2 chữ cái)', value: 'hard' },
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('Xem thống kê chuỗi nối từ của máy chủ hoặc người chơi cụ thể')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Xem thống kê máy chủ hay người chơi')
          .addChoices(
            { name: 'Người chơi (User)', value: 'user' },
            { name: 'Máy chủ (Server)', value: 'server' },
          )
          .setRequired(false),
      )
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Thành viên cần xem thống kê (mặc định là chính bạn)')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Chế độ chơi cho thống kê máy chủ')
          .addChoices(
            { name: 'Normal Mode (1 chữ cái)', value: 'normal' },
            { name: 'Hard Mode (2 chữ cái)', value: 'hard' },
          )
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('languages')
      .setDescription('Hiển thị danh sách ngôn ngữ đang được kích hoạt nối từ trong máy chủ'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('help')
      .setDescription('Xem cẩm nang luật chơi, hệ thống tính điểm Karma và hướng dẫn chi tiết'),
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'check':
        await checkSub(interaction);
        break;
      case 'definition':
        await definitionSub(interaction);
        break;
      case 'leaderboard':
        await leaderboardSub(interaction);
        break;
      case 'stats':
        await statsSub(interaction);
        break;
      case 'languages':
        await languagesSub(interaction);
        break;
      case 'help':
        await helpSub(interaction);
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
