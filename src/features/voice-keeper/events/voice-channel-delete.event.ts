import {
  type DMChannel,
  Events,
  type NonThreadGuildBasedChannel,
} from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';

export const event: BotEvent<Events.ChannelDelete> = {
  name: Events.ChannelDelete,
  execute: async (channel: DMChannel | NonThreadGuildBasedChannel) => {
    if (channel.isDMBased()) return;
    await voiceKeeperService.handleChannelDelete(
      channel as NonThreadGuildBasedChannel,
    );
  },
};

export default event;
