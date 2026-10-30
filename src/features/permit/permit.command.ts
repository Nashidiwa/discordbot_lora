import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import type { BotCommand } from '../../core/types/index.js';
import { PermitFlag } from '../../shared/permit/index.js';
import { getUserLocale, t } from '../../shared/utils/i18n.util.js';
import { permitLocale } from './permit.locale.js';
import coOwnerSub from './subcommands/co-owner.sub.js';
import grantSub from './subcommands/grant.sub.js';
import listSub from './subcommands/list.sub.js';
import revokeSub from './subcommands/revoke.sub.js';
import trustedAdminSub from './subcommands/trusted-admin.sub.js';

const flagChoices = [
  ...Object.keys(PermitFlag).map((key) => ({ name: key, value: key })),
  { name: 'ALL (Toàn bộ quyền)', value: 'ALL' },
];

const data = new SlashCommandBuilder()
  .setName('permit')
  .setDescription(
    'Hệ thống phân quyền ủy quyền nâng cao (Wick-style Custom Permit).',
  )
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('co_owner')
      .setDescription('Bổ nhiệm hoặc bãi nhiệm Co-Owner (Chỉ Server Owner).')
      .addStringOption((opt) =>
        opt
          .setName('action')
          .setDescription('Hành động cần thực hiện')
          .setRequired(true)
          .addChoices(
            { name: 'Thêm (Add)', value: 'add' },
            { name: 'Xóa (Remove)', value: 'remove' },
          ),
      )
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Người dùng được chỉ định')
          .setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('trusted_admin')
      .setDescription(
        'Bổ nhiệm hoặc xóa Trusted Admin (Server Owner hoặc Co-Owner).',
      )
      .addStringOption((opt) =>
        opt
          .setName('action')
          .setDescription('Hành động cần thực hiện')
          .setRequired(true)
          .addChoices(
            { name: 'Thêm (Add)', value: 'add' },
            { name: 'Xóa (Remove)', value: 'remove' },
          ),
      )
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Người dùng được chỉ định (tùy chọn nếu chọn role)')
          .setRequired(false),
      )
      .addRoleOption((opt) =>
        opt
          .setName('role')
          .setDescription('Vai trò được chỉ định (tùy chọn nếu chọn user)')
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('grant')
      .setDescription('Cấp quyền module cụ thể cho Người dùng hoặc Vai trò.')
      .addStringOption((opt) =>
        opt
          .setName('flag')
          .setDescription('Cờ quyền cần cấp phát')
          .setRequired(true)
          .addChoices(...flagChoices),
      )
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Người dùng được cấp quyền')
          .setRequired(false),
      )
      .addRoleOption((opt) =>
        opt
          .setName('role')
          .setDescription('Vai trò được cấp quyền')
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('revoke')
      .setDescription('Thu hồi phân quyền Permit của Người dùng hoặc Vai trò.')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Người dùng cần thu hồi quyền')
          .setRequired(false),
      )
      .addRoleOption((opt) =>
        opt
          .setName('role')
          .setDescription('Vai trò cần thu hồi quyền')
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('Hiển thị tổng quan các phân quyền Permit trong server.'),
  );

export const command: BotCommand = {
  data,
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'co_owner':
        await coOwnerSub(interaction);
        break;
      case 'trusted_admin':
        await trustedAdminSub(interaction);
        break;
      case 'grant':
        await grantSub(interaction);
        break;
      case 'revoke':
        await revokeSub(interaction);
        break;
      case 'list':
        await listSub(interaction);
        break;
      default: {
        const locale = await getUserLocale({
          locale: interaction.locale,
          guildId: interaction.guildId,
        });
        await interaction.reply({
          content: t(permitLocale, 'ERR_INVALID_COMMAND', locale),
          flags: MessageFlags.Ephemeral,
        });
        break;
      }
    }
  },
};

export default command;
