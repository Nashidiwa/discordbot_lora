import type { ExtendedClient } from './client.js';
import { stopAllJobs } from './loaders/job.loader.js';
import { logger } from './logger.js';
import { stopServer } from './server/server.js';
import type { DatabaseClient } from '../shared/db/client.js';

export type CleanupHook = () => Promise<void> | void;

let isShuttingDown = false;
let registeredClient: ExtendedClient | null = null;
let registeredDbClient: DatabaseClient | null = null;
const cleanupHooks: CleanupHook[] = [];

/**
 * Kiểm tra xem tiến trình có đang trong giai đoạn tắt hệ thống không
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Đăng ký hook dọn dẹp tài nguyên trước khi tiến trình kết thúc
 */
export function registerCleanupHook(hook: CleanupHook): void {
  cleanupHooks.push(hook);
}

/**
 * Kích hoạt quy trình tắt máy an toàn (Graceful Shutdown)
 */
export async function triggerGracefulShutdown(
  exitCode: number = 0,
  reason: string = 'MANUAL',
): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // Unref'd Watchdog Timer: Force exit if graceful shutdown hangs for more than 10 seconds
  const forceExitTimeout = setTimeout(() => {
    logger.fatal('Graceful shutdown sequence timed out after 10s. Forcing exit.');
    process.exit(exitCode || 1);
  }, 10_000);
  forceExitTimeout.unref();

  logger.info(
    { reason, exitCode },
    'Initiating graceful shutdown sequence...',
  );

  try {
    // 1. Dừng Scheduled Jobs
    logger.info('[1/5] Stopping scheduled background jobs...');
    stopAllJobs();

    // 2. Thực thi các Cleanup Hooks (Voice Connections, game caches,...)
    logger.info('[2/5] Executing registered subsystem cleanup hooks...');
    for (const hook of cleanupHooks) {
      try {
        await hook();
      } catch (hookErr: unknown) {
        logger.warn({ err: hookErr }, 'Error executing cleanup hook during shutdown');
      }
    }

    // 3. Đóng HTTP Web Server
    logger.info('[3/5] Closing HTTP Web Server...');
    await stopServer();

    // 4. Ngắt kết nối Database
    if (registeredDbClient) {
      logger.info('[4/5] Disconnecting from database...');
      await registeredDbClient.$disconnect();
    }

    // 5. Hủy Discord Gateway Client & Thoát
    if (registeredClient) {
      logger.info('[5/5] Destroying Discord client and exiting...');
      await registeredClient.destroy();
    }

    logger.info('Graceful shutdown completed successfully');
    process.exit(exitCode);
  } catch (err: unknown) {
    logger.fatal({ err }, 'Error occurred during graceful shutdown');
    process.exit(1);
  }
}

export function registerGracefulShutdown(
  client: ExtendedClient,
  dbClient: DatabaseClient,
): void {
  registeredClient = client;
  registeredDbClient = dbClient;

  process.on('SIGINT', () => {
    void triggerGracefulShutdown(0, 'SIGINT');
  });
  process.on('SIGTERM', () => {
    void triggerGracefulShutdown(0, 'SIGTERM');
  });
}
