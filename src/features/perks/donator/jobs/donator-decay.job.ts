import type { BotJob, JobContext } from '../../../../core/types/index.js';
import { donatorPerkService } from '../services/donator-perk.service.js';

export const job: BotJob = {
  name: 'donator-decay',
  cronExpression: '0 17 * * 0', // 17:00 UTC Sunday = 00:00:00 Monday in Asia/Ho_Chi_Minh (UTC+7)
  execute: async (_context: JobContext): Promise<void> => {
    await donatorPerkService.processWeeklyDecay();
  },
};

export default job;
