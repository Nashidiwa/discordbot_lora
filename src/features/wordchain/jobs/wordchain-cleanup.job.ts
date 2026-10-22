import type { BotJob, JobContext } from '../../../core/types/index.js';
import { logger } from '../../../core/logger.js';
import { WordChainConstants } from '../wordchain.constants.js';
import { wordChainGameService } from '../services/wordchain-game.service.js';

export const job: BotJob = {
  name: 'wordchain-retention-cleanup',
  cronExpression: WordChainConstants.CLEANUP_CRON,
  runOnInit: true,
  execute: async (_context: JobContext): Promise<void> => {
    try {
      logger.info('Word Chain: Executing 7-day retention grace period purge watchdog');
      const purgedCount = await wordChainGameService.purgeOverdueGuilds();
      if (purgedCount > 0) {
        logger.info({ purgedCount }, 'Word Chain: Successfully purged overdue guild records');
      } else {
        logger.debug('Word Chain: No overdue guilds to purge at this time');
      }
    } catch (err: unknown) {
      logger.error({ err }, 'Word Chain: Error during scheduled retention cleanup job');
    }
  },
};

export default job;
