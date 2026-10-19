import type { BotJob, JobContext } from '../../../../core/types/index.js';
import { boosterPerkService } from '../services/booster-perk.service.js';

export const job: BotJob = {
  name: 'booster-grace-period-cleanup',
  cronExpression: '*/10 * * * *',
  execute: async ({ client }: JobContext): Promise<void> => {
    await boosterPerkService.cleanupExpiredGracePeriods(client);
  },
};

export default job;
