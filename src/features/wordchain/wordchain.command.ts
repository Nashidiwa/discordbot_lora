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
  .setDescription('Tính năng trò chơi Word Chain (nối từ)')
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('check')
      .setDescription('Kiểm tra tính hợp lệ của một từ xác định')
      .addStringOption((opt) =>
        opt
          .setName('word')
          .setDescription('Từ cần kiểm tra')
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
          .setDescription('Từ cần tra nghĩa')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription('Xem leaderboard điểm số và Karma của user hoặc server')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Loại leaderboard')
          .addChoices(
            { name: 'Người chơi (User)', value: 'user' },
            { name: 'Máy chủ (Server)', value: 'server' },
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('metric')
          .setDescription('Tiêu chí xếp hạng user')
          .addChoices(
            { name: 'Điểm số (Score)', value: 'score' },
            { name: 'Karma hợp tác (Karma)', value: 'karma' },
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('scope')
          .setDescription('Phạm vi xếp hạng user')
          .addChoices(
            { name: 'Trong server này (Server)', value: 'server' },
            { name: 'Toàn cầu (Global)', value: 'global' },
          )
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Chế độ chơi cho leaderboard server')
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
      .setDescription('Xem thống kê chuỗi nối từ của server hoặc user cụ thể')
      .addStringOption((opt) =>
        opt
          .setName('type')
          .setDescription('Xem thống kê server hay user')
          .addChoices(
            { name: 'Người chơi (User)', value: 'user' },
            { name: 'Máy chủ (Server)', value: 'server' },
          )
          .setRequired(false),
      )
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('User cần xem thống kê')
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName('mode')
          .setDescription('Chế độ chơi cho thống kê server')
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
      .setDescription('Xem danh sách ngôn ngữ đang được đặt Word Chain trong server'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('help')
      .setDescription('Xem luật chơi, cách tính điểm Karma và thông tin chi tiết'),
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
          content: 'Yêu cầu không hợp lệ.',
          flags: MessageFlags.Ephemeral,
        });
        break;
    }
  },
};

export default command;
