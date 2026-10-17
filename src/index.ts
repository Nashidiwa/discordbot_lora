import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { ExtendedClient } from './core/client.js';
import { loadCommands } from './core/loaders/command.loader.js';
import { loadEvents } from './core/loaders/event.loader.js';
import { loadJobs } from './core/loaders/job.loader.js';
import { loadRoutes } from './core/loaders/route.loader.js';
import { startServer } from './core/server/server.js';
import { registerGracefulShutdown } from './core/lifecycle.js';
import { db } from './shared/db/client.js';

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

  // 1. Register Graceful Shutdown
  registerGracefulShutdown(client, db);

  // 2. Load Commands & Events
  const commandsCount = await loadCommands(client);
  const eventsCount = await loadEvents(client);

  // 3. Load Background Jobs
  const jobsCount = await loadJobs(client, db);

  // 4. Load HTTP Routes & Start Fastify Server
  const routesCount = await loadRoutes(client, db);
  await startServer(config.PORT);

  logger.info(
    { commandsCount, eventsCount, jobsCount, routesCount },
    'Core dynamic loaders initialized successfully',
  );

  // 5. Connect to Discord Gateway
  await client.login(config.DISCORD_TOKEN);
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to bootstrap Discord Bot application');
  process.exit(1);
});
