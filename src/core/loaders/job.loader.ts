import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import cron, { type ScheduledTask } from 'node-cron';
import type { DatabaseClient } from '../../shared/db/client.js';
import type { ExtendedClient } from '../client.js';
import { logger } from '../logger.js';
import type { BotJob } from '../types/index.js';

const JOB_FILE_REGEX = /\.job\.(ts|js)$/;
const EXCLUDE_FILE_REGEX = /(\.d\.ts|\.map)$/;

export const activeJobs: ScheduledTask[] = [];

export function stopAllJobs(): void {
  for (const job of activeJobs) {
    job.stop();
  }
  activeJobs.length = 0;
  logger.info('All background jobs stopped');
}

function isBotJob(obj: unknown): obj is BotJob {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.length === 0) {
    return false;
  }

  if (
    typeof candidate.cronExpression !== 'string' ||
    candidate.cronExpression.length === 0
  ) {
    return false;
  }

  return typeof candidate.execute === 'function';
}

async function getFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getFilesRecursively(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function loadJobs(
  client: ExtendedClient,
  db: DatabaseClient,
  customDir?: string,
): Promise<number> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const targetDir = customDir ?? path.resolve(currentDir, '../../features');

  if (!fs.existsSync(targetDir)) {
    logger.warn(
      { dir: targetDir },
      'Features directory does not exist, skipping job loading',
    );
    return 0;
  }

  let filePaths: string[] = [];
  try {
    filePaths = await getFilesRecursively(targetDir);
  } catch (err: unknown) {
    logger.error({ err, dir: targetDir }, 'Failed to scan jobs directory');
    return 0;
  }

  const jobFiles = filePaths.filter(
    (filePath) =>
      JOB_FILE_REGEX.test(filePath) && !EXCLUDE_FILE_REGEX.test(filePath),
  );

  let loadedCount = 0;

  for (const filePath of jobFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const importedModule = (await import(fileUrl)) as Record<string, unknown>;
      const job = importedModule.default ?? importedModule.job;

      if (isBotJob(job)) {
        if (!cron.validate(job.cronExpression)) {
          logger.error(
            {
              job: job.name,
              cronExpression: job.cronExpression,
              path: relativePath,
            },
            'Invalid cron expression, skipping job registration',
          );
          continue;
        }

        let isRunning = false;
        const scheduledTask = cron.schedule(job.cronExpression, async () => {
          if (isRunning) {
            logger.warn(
              { job: job.name },
              'Job is already running, skipping overlapping execution',
            );
            return;
          }
          isRunning = true;
          try {
            await job.execute({ client, db });
          } catch (err: unknown) {
            logger.error(
              { err, job: job.name },
              'Unhandled error during job execution',
            );
          } finally {
            isRunning = false;
          }
        });

        activeJobs.push(scheduledTask);

        logger.debug(
          {
            name: job.name,
            cronExpression: job.cronExpression,
            path: relativePath,
          },
          'Registered Background Job',
        );

        if (job.runOnInit) {
          logger.debug({ name: job.name }, 'Executing job on initialization');
          try {
            await job.execute({ client, db });
          } catch (err: unknown) {
            logger.error(
              { err, job: job.name },
              'Unhandled error during job runOnInit execution',
            );
          }
        }

        loadedCount++;
      } else {
        logger.warn({ path: relativePath }, 'Skipped invalid job export');
      }
    } catch (err: unknown) {
      logger.error({ err, path: relativePath }, 'Failed to load job file');
    }
  }

  return loadedCount;
}
