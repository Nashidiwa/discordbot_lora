import type { BotJob, JobContext } from '../../../../core/types/index.js';
import { donatorPerkService } from '../services/donator-perk.service.js';

export const job: BotJob = {
  name: 'donator-cleanup',
  cronExpression: '*/10 * * * *', // Run every 10 minutes
  execute: async ({ client }: JobContext): Promise<void> => {
    await donatorPerkService.cleanupDepletedAccounts(client);
  },
};

export default job;
