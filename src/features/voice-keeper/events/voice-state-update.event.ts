import { Events, type VoiceState } from 'discord.js';
import type { BotEvent } from '../../../core/types/index.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';

export const event: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  execute: async (oldState: VoiceState, newState: VoiceState) => {
    await voiceKeeperService.handleBotVoiceStateUpdate(oldState, newState);
  },
};

export default event;
