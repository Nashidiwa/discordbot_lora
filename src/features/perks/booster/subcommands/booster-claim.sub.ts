import type {
  ChatInputCommandInteraction,
  GuildMember,
} from 'discord.js';
import type { SubcommandExecutor } from '../../../../core/types/index.js';
import {
  createBaseEmbed,
  createSuccessEmbed,
} from '../../../../shared/utils/embed.util.js';
import { perksLocale } from '../../common/perks.locale.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const execute: SubcommandExecutor = async (
  interaction: ChatInputCommandInteraction,
): Promise<void> => {
  const member = interaction.member as GuildMember;
  const result = await boosterPerkService.claimCustomRole(
    interaction.guild!,
    member,
  );

  if (result.status === 'ALREADY_EQUIPPED') {
    const embed = createBaseEmbed({
      title: '👑 Custom Role Của Bạn',
      description: perksLocale.vi.ROLE_ALREADY_EQUIPPED,
    }).addFields({
      name: '🏷️ Role Hiện Tại',
      value: `<@&${result.roleId}> (**${result.roleName}**)`,
    });
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const successMessage =
    result.status === 'CLAIM_NEW'
      ? perksLocale.vi.ROLE_CLAIM_NEW
      : perksLocale.vi.ROLE_CLAIM_REEQUIP;

  const embed = createSuccessEmbed(
    `${successMessage}\n\n• Role: <@&${result.roleId}>\n• Gợi ý: Dùng \`/perk server_booster role_config\` để đổi tên và màu sắc tùy thích.`,
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
