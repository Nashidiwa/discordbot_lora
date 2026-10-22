import {
  Events,
  type Interaction,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { EmbedColor } from '../../../shared/constants/colors.js';
import { db } from '../../../shared/db/client.js';
import { getUserLocale, t } from '../../../shared/utils/i18n.util.js';
import { wordChainLocale } from '../wordchain.locale.js';

export interface HelpTopic {
  title: string;
  descVi: string;
  descEn: string;
}

export const DEFAULT_HELP_TOPIC: HelpTopic = {
  title: 'Cách Chơi Cơ Bản / How to Play',
  descVi:
    'Người chơi thay phiên nhau gửi các từ hợp lệ vào kênh chơi. Từ sau phải bắt đầu bằng chữ cái kết thúc của từ trước (Normal Mode) hoặc 2 chữ cái kết thúc (Hard Mode). Cố gắng lập kỷ lục chuỗi dài nhất có thể!',
  descEn:
    'Players take turns entering valid words in the active game channel. The next word must begin with the last character (Normal Mode) or last 2 characters (Hard Mode) of the previous word. Work together to beat the server high score!',
};

export const HELP_TOPICS: Record<string, HelpTopic> = {
  how_to_play: DEFAULT_HELP_TOPIC,
  game_rules: {
    title: 'Luật Chơi & Các Chế Độ / Game Rules',
    descVi:
      '• Không được gửi 2 từ liên tiếp trong chế độ nhiều người.\n• Không chấp nhận từ 1 ký tự, số, khoảng trắng hoặc ký tự đặc biệt.\n• Từ phải có trong từ điển Wiktionary hoặc danh sách trắng.\n• Làm hỏng chuỗi sẽ đưa kỷ lục về 0 và trừ 5 điểm Karma.',
    descEn:
      '• You cannot send two words in a row in multiplayer mode.\n• Single-character inputs, digits, spaces, and symbols are rejected.\n• Words must exist on Wiktionary or server whitelist.\n• Mistakes reset current chain to 0 and penalize player by -5.0 Karma.',
  },
  setup_in_server: {
    title: 'Cài Đặt Máy Chủ / Server Setup Guide',
    descVi:
      'Dành cho Quản trị viên:\n• Dùng `/wordchain-manage channel set` để gắn kênh chơi Normal hoặc Hard.\n• Dùng `/wordchain-manage role set reliable` để gán vai trò người chơi uy tín.\n• Dùng `/wordchain-manage role set failed` để gán vai trò xấu hổ cho người phá chuỗi.',
    descEn:
      'For Administrators:\n• Use `/wordchain-manage channel set` to bind Normal or Hard mode channels.\n• Use `/wordchain-manage role set reliable` to configure the Reliable player role.\n• Use `/wordchain-manage role set failed` to configure the Failed role.',
  },
  karma_system: {
    title: 'Cơ Chế Điểm Karma / Karma & Repetition Decay',
    descVi:
      'Karma đo lường mức độ hợp tác của bạn:\n• Bắt đầu bằng chữ cái khó sẽ nhận điểm thưởng cao.\n• Để lại chữ cái phổ biến cho đồng đội sẽ cộng thêm Karma.\n• Spam liên tục các hậu tố giống nhau (như -s, -ing) sẽ kích hoạt cơ chế suy giảm số mũ khiến Karma bị âm!',
    descEn:
      'Karma evaluates cooperative gameplay:\n• Finding words with difficult starting tokens awards positive karma.\n• Leaving friendly ending tokens for teammates awards bonus karma.\n• Repeatedly ending words in the same letters (e.g. -s) triggers exponential decay that can turn karma negative!',
  },
  list_commands: {
    title: 'Danh Sách Lệnh / List of Commands',
    descVi:
      '• `/wordchain check <word>`: Kiểm tra tính hợp lệ của từ.\n• `/wordchain definition <word>`: Tra cứu định nghĩa từ điển.\n• `/wordchain leaderboard`: Xem bảng xếp hạng cá nhân hoặc máy chủ.\n• `/wordchain stats`: Xem thống kê chi tiết chuỗi và người chơi.\n• `/wordchain-manage`: Bộ lệnh cấu hình máy chủ.',
    descEn:
      '• `/wordchain check <word>`: Test word validity before submitting.\n• `/wordchain definition <word>`: Look up Wiktionary definition.\n• `/wordchain leaderboard`: View user or server leaderboards.\n• `/wordchain stats`: View active chain or player statistics.\n• `/wordchain-manage`: Server management command suite.',
  },
  privacy_policy: {
    title: 'Chính Sách Bảo Mật / Privacy Policy',
    descVi:
      'Bot lưu trữ User ID, điểm số, và từ đã chơi để vận hành trò chơi. Tuân thủ GDPR: Quản trị viên bot có thể xóa sạch mọi dữ liệu của người dùng trên toàn hệ thống bằng lệnh `/wordchain-manage admin purge-user`.',
    descEn:
      'The bot stores User IDs, scores, and played words strictly for gameplay purposes. GDPR Compliant: System administrators can erase all member records across all guilds using `/wordchain-manage admin purge-user`.',
  },
  support_server: {
    title: 'Máy Chủ Hỗ Trợ / Support Server',
    descVi:
      'Ghé thăm máy chủ hỗ trợ chính thức để báo cáo lỗi từ điển hoặc đề xuất tính năng mới: https://discord.gg/lora',
    descEn:
      'Visit our official support server for dictionary appeals, bug reports, and updates: https://discord.gg/lora',
  },
  other_info: {
    title: 'Thông Tin Mã Nguồn / Project Credits',
    descVi:
      'Word Chain được xây dựng dựa trên dự án mã nguồn mở của Indently, sử dụng từ điển Wiktionary của Wikimedia Foundation và dữ liệu tần số ngôn ngữ Leipzig Wortschatz.',
    descEn:
      'Word Chain is built upon the open-source architecture by Indently, powered by Wikimedia Wiktionary and Leipzig Wortschatz frequency datasets.',
  },
  vote: {
    title: 'Bình Chọn Cho Bot / Vote for the Bot',
    descVi:
      'Hãy ủng hộ bot trên các nền tảng Top.gg và DiscordBotList để giúp cộng đồng ngày càng phát triển!',
    descEn:
      'Support the bot by voting on Top.gg and DiscordBotList to help grow the community!',
  },
  multi_language: {
    title: 'Hệ Thống Đa Ngôn Ngữ / Multi-Language Support',
    descVi:
      'Phiên bản ban đầu hỗ trợ tiếng Anh (`en`). Kiến trúc hỗ trợ mở rộng thêm 21 ngôn ngữ Châu Âu trong các bản cập nhật tương lai.',
    descEn:
      'Initial release exclusively supports English (`en`). The underlying architecture is extensible to support 21 additional European languages in future releases.',
  },
};

export function buildHelpSelectMenu(invokerId: string, selectedValue = 'how_to_play') {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`wordchain:help:${invokerId}`)
    .setPlaceholder('Chọn một chuyên đề trợ giúp / Choose a help topic')
    .addOptions(
      Object.entries(HELP_TOPICS).map(([key, topic]) =>
        new StringSelectMenuOptionBuilder()
          .setValue(key)
          .setLabel(topic.title.split(' / ')[0] ?? key)
          .setDescription(topic.title.split(' / ')[1] ?? '')
          .setDefault(key === selectedValue),
      ),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

export const event: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  execute: async (interaction: Interaction): Promise<void> => {
    // 1. Handle Help Dropdown Menu Interactions
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('wordchain:help:')) {
      const invokerId = interaction.customId.split(':')[2];
      const locale = await getUserLocale({
        locale: interaction.locale,
        guildId: interaction.guildId,
      });

      // Reject non-invokers
      if (interaction.user.id !== invokerId) {
        await interaction.reply({
          content: t(wordChainLocale, 'ERR_ONLY_INVOKER_CAN_INTERACT', locale),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const selectedKey = interaction.values[0] ?? 'how_to_play';
      const topic = HELP_TOPICS[selectedKey] ?? DEFAULT_HELP_TOPIC;

      const embed = new EmbedBuilder()
        .setColor(EmbedColor.PRIMARY)
        .setTitle(topic.title)
        .setDescription(locale === 'vi' ? topic.descVi : topic.descEn)
        .setFooter({ text: 'Word Chain • Hướng dẫn trò chơi' });

      const row = buildHelpSelectMenu(invokerId, selectedKey);
      await interaction.update({ embeds: [embed], components: [row] });
      return;
    }

    // 2. Handle Autocomplete Interactions for /wordchain-manage
    if (interaction.isAutocomplete()) {
      const commandName = interaction.commandName;
      if (commandName !== 'wordchain-manage') return;

      const focusedOption = interaction.options.getFocused(true);
      const guildId = interaction.guildId;

      if (!guildId) {
        await interaction.respond([]);
        return;
      }

      if (focusedOption.name === 'word') {
        const subGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand(false);

        if (subGroup === 'blacklist' && subcommand === 'remove') {
          const list = await db.wordChainBlacklist.findMany({
            where: {
              guildId,
              word: { startsWith: focusedOption.value.toLowerCase() },
            },
            take: 25,
          });
          await interaction.respond(list.map((r) => ({ name: r.word, value: r.word })));
          return;
        }

        if (subGroup === 'whitelist' && subcommand === 'remove') {
          const list = await db.wordChainWhitelist.findMany({
            where: {
              guildId,
              word: { startsWith: focusedOption.value.toLowerCase() },
            },
            take: 25,
          });
          await interaction.respond(list.map((r) => ({ name: r.word, value: r.word })));
          return;
        }
      }

      if (focusedOption.name === 'language_code') {
        await interaction.respond([{ name: 'English (en)', value: 'en' }]);
        return;
      }

      await interaction.respond([]);
    }
  },
};

export default event;
