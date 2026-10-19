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
  const result = await boosterPerkService.unclaimCustomRole(
    interaction.guild!,
    member,
  );

  const embed = createSuccessEmbed(
    `${perksLocale.vi.ROLE_UNCLAIM_SUCCESS}\n\n• Role: <@&${result.roleId}>`,
  );

  await interaction.editReply({ embeds: [embed] });
};

export default execute;
