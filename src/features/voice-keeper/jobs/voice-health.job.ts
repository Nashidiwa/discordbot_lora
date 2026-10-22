import type { BotJob, JobContext } from '../../../core/types/index.js';
import { voiceKeeperService } from '../services/voice-keeper.service.js';
import { VoiceKeeperConstants } from '../voice-keeper.constants.js';

export const job: BotJob = {
  name: 'voice-keeper-health-watchdog',
  cronExpression: VoiceKeeperConstants.HEALTH_CHECK_CRON,
  execute: async ({ client }: JobContext): Promise<void> => {
    await voiceKeeperService.checkHealth(client);
  },
};

export default job;
