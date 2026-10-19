import type {
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import { createSuccessEmbed } from '../../../../shared/utils/embed.util.js';
import { perksLocale } from '../../common/perks.locale.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const member = interaction.member as GuildMember;
  const name = interaction.options.getString('name') ?? undefined;
  const color1 = interaction.options.getString('color1') ?? undefined;
  const color2 = interaction.options.getString('color2') ?? undefined;

  const result = await boosterPerkService.configCustomRole(
    interaction.guild!,
    member,
    {
      name,
      color1,
      color2,
    },
  );

  const colorDisplay = result.roleColor2
    ? `\`${result.roleColor}\` + \`${result.roleColor2}\` (Gradient)`
    : `\`${result.roleColor ?? 'Không đổi'}\``;

  const embed = createSuccessEmbed(
    `${perksLocale.vi.ROLE_CONFIG_SUCCESS}\n\n• Tên Role: **${result.roleName ?? 'Không đổi'}**\n• Màu sắc: ${colorDisplay}`,
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
