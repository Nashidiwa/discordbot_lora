import {
  Events,
  type GuildMember,
  type PartialGuildMember,
} from 'discord.js';
import type { BotEvent } from '../../../../core/types/index.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const event: BotEvent<Events.GuildMemberUpdate> = {
  name: Events.GuildMemberUpdate,
  once: false,
  execute: async (
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember,
  ): Promise<void> => {
    const guildId = newMember.guild.id;
    const userId = newMember.id;

    // Member unboosted server
    if (oldMember.premiumSince && !newMember.premiumSince) {
      await boosterPerkService.handleUnboost(guildId, userId);
    }
    // Member re-boosted server
    else if (!oldMember.premiumSince && newMember.premiumSince) {
      await boosterPerkService.handleReboost(guildId, userId);
    }
  },
};

export default event;
