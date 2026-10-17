import type { ExtendedClient } from './client.js';
import { stopAllJobs } from './loaders/job.loader.js';
import { logger } from './logger.js';
import { stopServer } from './server/server.js';
import type { DatabaseClient } from '../shared/db/client.js';

let isShuttingDown = false;

export function registerGracefulShutdown(
  client: ExtendedClient,
  dbClient: DatabaseClient,
): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(
      { signal },
      'Received termination signal, initiating graceful shutdown...',
    );

    try {
      // 1. Dừng Scheduled Jobs
      logger.info('[1/5] Stopping scheduled background jobs...');
      stopAllJobs();

      // 2. Ngắt Voice Connections (nếu có guilds voice)
      logger.info('[2/5] Cleaning up voice connections...');

      // 3. Đóng HTTP Web Server
      logger.info('[3/5] Closing HTTP Web Server...');
      await stopServer();

      // 4. Ngắt kết nối Database
      logger.info('[4/5] Disconnecting from database...');
      await dbClient.$disconnect();

      // 5. Hủy Discord Gateway Client & Thoát
      logger.info('[5/5] Destroying Discord client and exiting...');
      client.destroy();

      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (err: unknown) {
      logger.fatal({ err }, 'Error occurred during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}
