import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ExtendedClient } from '../client.js';
import { logger } from '../logger.js';
import type { BotCommand } from '../types/index.js';

const COMMAND_FILE_REGEX = /\.command\.(ts|js)$/;
const EXCLUDE_FILE_REGEX = /(\.sub\.(ts|js)|\.d\.ts|\.map)$/;

function isBotCommand(obj: unknown): obj is BotCommand {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const candidate = obj as Record<string, unknown>;
  if (typeof candidate.execute !== 'function') {
    return false;
  }

  if (typeof candidate.data !== 'object' || candidate.data === null) {
    return false;
  }

  const data = candidate.data as Record<string, unknown>;
  return typeof data.name === 'string' && data.name.length > 0;
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

export async function loadCommands(
  client: ExtendedClient,
  customDir?: string,
): Promise<number> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const targetDir = customDir ?? path.resolve(currentDir, '../../features');

  if (!fs.existsSync(targetDir)) {
    logger.warn(
      { dir: targetDir },
      'Features directory does not exist, skipping command loading',
    );
    return 0;
  }

  let filePaths: string[] = [];
  try {
    filePaths = await getFilesRecursively(targetDir);
  } catch (err: unknown) {
    logger.error({ err, dir: targetDir }, 'Failed to scan commands directory');
    return 0;
  }

  const commandFiles = filePaths.filter(
    (filePath) =>
      COMMAND_FILE_REGEX.test(filePath) && !EXCLUDE_FILE_REGEX.test(filePath),
  );

  let loadedCount = 0;

  for (const filePath of commandFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const importedModule = (await import(fileUrl)) as Record<string, unknown>;
      const command = importedModule.default ?? importedModule.command;

      if (isBotCommand(command)) {
        client.commands.set(command.data.name, command);
        logger.debug(
          { name: command.data.name, path: relativePath },
          'Registered Slash Command',
        );
        loadedCount++;
      } else {
        logger.warn({ path: relativePath }, 'Skipped invalid command export');
      }
    } catch (err: unknown) {
      logger.error({ err, path: relativePath }, 'Failed to load command file');
    }
  }

  return loadedCount;
}
