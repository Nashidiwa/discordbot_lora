import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { ExtendedClient } from './core/client.js';
import { loadCommands } from './core/loaders/command.loader.js';
import { loadEvents } from './core/loaders/event.loader.js';

// Process Safety Nets
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection detected');
});

process.on('uncaughtException', (err: Error) => {
  logger.fatal({ err }, 'Uncaught Exception detected, shutting down...');
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  logger.info('Starting Discord Bot ecosystem...');

  const client = new ExtendedClient();

  const commandsCount = await loadCommands(client);
  const eventsCount = await loadEvents(client);

  logger.info(
    { commandsCount, eventsCount },
    'Core dynamic loaders initialized successfully',
  );

  await client.login(config.DISCORD_TOKEN);
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to bootstrap Discord Bot application');
  process.exit(1);
});
