import type { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ExtendedClient } from '../client.js';
import { logger } from '../logger.js';
import type { BotEvent } from '../types/index.js';

const EVENT_FILE_REGEX = /\.event\.(ts|js)$/;
const GENERAL_SCRIPT_REGEX = /\.(ts|js)$/;
const EXCLUDE_FILE_REGEX = /(\.d\.ts|\.map)$/;

function isBotEvent(obj: unknown): obj is BotEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || candidate.name.length === 0) {
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

export async function loadEvents(
  client: ExtendedClient,
  customDirs?: string[],
): Promise<number> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const targetDirs = customDirs ?? [
    path.resolve(currentDir, '../../features'),
    path.resolve(currentDir, '../events'),
  ];

  let loadedCount = 0;

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    let filePaths: string[] = [];
    try {
      filePaths = await getFilesRecursively(dir);
    } catch (err: unknown) {
      logger.error({ err, dir }, 'Failed to scan events directory');
      continue;
    }

    const isCoreEventsDir = dir.includes(path.join('core', 'events'));
    const eventFiles = filePaths.filter((filePath) => {
      if (EXCLUDE_FILE_REGEX.test(filePath)) {
        return false;
      }
      return isCoreEventsDir
        ? GENERAL_SCRIPT_REGEX.test(filePath)
        : EVENT_FILE_REGEX.test(filePath);
    });

    for (const filePath of eventFiles) {
      const relativePath = path.relative(process.cwd(), filePath);
      try {
        const fileUrl = pathToFileURL(filePath).href;
        const importedModule = (await import(fileUrl)) as Record<string, unknown>;
        const event = importedModule.default ?? importedModule.event;

        if (isBotEvent(event)) {
          const handler = async (...args: unknown[]) => {
            try {
              await event.execute(...(args as Parameters<typeof event.execute>));
            } catch (err: unknown) {
              logger.error(
                { err, event: event.name, path: relativePath },
                'Unhandled error in event handler',
              );
            }
          };

          const eventEmitter = client as EventEmitter;
          if (event.once) {
            eventEmitter.once(event.name, handler);
          } else {
            eventEmitter.on(event.name, handler);
          }

          logger.debug(
            { name: event.name, once: !!event.once, path: relativePath },
            'Registered Gateway Event',
          );
          loadedCount++;
        } else {
          logger.warn({ path: relativePath }, 'Skipped invalid event export');
        }
      } catch (err: unknown) {
        logger.error({ err, path: relativePath }, 'Failed to load event file');
      }
    }
  }

  return loadedCount;
}
