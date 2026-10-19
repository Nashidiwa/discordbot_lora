import {
  Events,
  type GuildMember,
  type PartialGuildMember,
} from 'discord.js';
import type { BotEvent } from '../../../../core/types/index.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const event: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  once: false,
  execute: async (
    member: GuildMember | PartialGuildMember,
  ): Promise<void> => {
    await boosterPerkService.handleUnboost(member.guild.id, member.id);
  },
};

export default event;
