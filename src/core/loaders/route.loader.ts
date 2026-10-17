import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { DatabaseClient } from '../../shared/db/client.js';
import type { ExtendedClient } from '../client.js';
import { logger } from '../logger.js';
import { server } from '../server/server.js';
import type { BotRoute } from '../types/index.js';

const ROUTE_FILE_REGEX = /\.route\.(ts|js)$/;
const EXCLUDE_FILE_REGEX = /(\.d\.ts|\.map)$/;

function isBotRoute(obj: unknown): obj is BotRoute {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.register === 'function' ||
    typeof candidate.execute === 'function'
  );
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

export async function loadRoutes(
  client: ExtendedClient,
  db: DatabaseClient,
  customDir?: string,
): Promise<number> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const targetDir = customDir ?? path.resolve(currentDir, '../../features');

  if (!fs.existsSync(targetDir)) {
    logger.warn(
      { dir: targetDir },
      'Features directory does not exist, skipping route loading',
    );
    return 0;
  }

  let filePaths: string[] = [];
  try {
    filePaths = await getFilesRecursively(targetDir);
  } catch (err: unknown) {
    logger.error({ err, dir: targetDir }, 'Failed to scan routes directory');
    return 0;
  }

  const routeFiles = filePaths.filter(
    (filePath) =>
      ROUTE_FILE_REGEX.test(filePath) && !EXCLUDE_FILE_REGEX.test(filePath),
  );

  let loadedCount = 0;

  for (const filePath of routeFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const importedModule = (await import(fileUrl)) as Record<string, unknown>;
      const rawRoute = importedModule.default ?? importedModule.route;

      if (isBotRoute(rawRoute)) {
        const registerFn =
          rawRoute.register ??
          (rawRoute as unknown as { execute: BotRoute['register'] }).execute;

        const botRoute: BotRoute = {
          prefix: rawRoute.prefix,
          register: registerFn,
        };

        if (botRoute.prefix) {
          await server.register(
            async (scope) => {
              await botRoute.register(scope, { client, db });
            },
            { prefix: botRoute.prefix },
          );
        } else {
          await botRoute.register(server, { client, db });
        }

        logger.debug(
          { prefix: botRoute.prefix ?? '/', path: relativePath },
          'Registered Fastify Route Plugin',
        );
        loadedCount++;
      } else {
        logger.warn({ path: relativePath }, 'Skipped invalid route export');
      }
    } catch (err: unknown) {
      logger.error({ err, path: relativePath }, 'Failed to load route file');
    }
  }

  return loadedCount;
}
