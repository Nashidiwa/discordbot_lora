import { REST, Routes } from 'discord.js';
import { ExtendedClient } from '../client.js';
import { config } from '../config.js';
import { loadCommands } from '../loaders/command.loader.js';
import { logger } from '../logger.js';

function printUsage(): void {
  const usage = `
===================================================================
  Discord Slash Command Deployment CLI
===================================================================
  Usage:
    npm run deploy:dev           Deploy commands to test guild
    npm run deploy:prod          Deploy commands globally
    npm run deploy:clear:dev     Remove all test guild commands
    npm run deploy:clear:global  Remove all global commands

  Direct CLI Flags:
    --dev            Triển khai Slash Commands cho Server Test (DEV_GUILD_ID)
    --prod           Triển khai Slash Commands trên phạm vi Global
    --clear-dev      Xóa toàn bộ Slash Commands trên Server Test
    --clear-global   Xóa toàn bộ Slash Commands trên phạm vi Global
===================================================================
`;
  process.stdout.write(usage + '\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = args[0];

  if (
    !flag ||
    !['--dev', '--prod', '--clear-dev', '--clear-global'].includes(flag)
  ) {
    printUsage();
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  try {
    if (flag === '--dev' || flag === '--prod') {
      const client = new ExtendedClient();
      await loadCommands(client);

      const commandsData = Array.from(client.commands.values()).map((cmd) =>
        cmd.data.toJSON(),
      );

      if (commandsData.length === 0) {
        logger.warn('No commands found in src/features/ to deploy');
      }

      if (flag === '--dev') {
        logger.info(
          { count: commandsData.length, guildId: config.DEV_GUILD_ID },
          'Deploying application commands to test guild...',
        );
        await rest.put(
          Routes.applicationGuildCommands(
            config.CLIENT_ID,
            config.DEV_GUILD_ID,
          ),
          { body: commandsData },
        );
        logger.info(
          { count: commandsData.length, guildId: config.DEV_GUILD_ID },
          'Successfully deployed application commands to test guild',
        );
      } else {
        logger.info(
          { count: commandsData.length },
          'Deploying application commands globally...',
        );
        await rest.put(Routes.applicationCommands(config.CLIENT_ID), {
          body: commandsData,
        });
        logger.info(
          { count: commandsData.length },
          'Successfully deployed application commands globally',
        );
      }
    } else if (flag === '--clear-dev') {
      logger.info(
        { guildId: config.DEV_GUILD_ID },
        'Clearing application commands from test guild...',
      );
      await rest.put(
        Routes.applicationGuildCommands(
          config.CLIENT_ID,
          config.DEV_GUILD_ID,
        ),
        { body: [] },
      );
      logger.info(
        { guildId: config.DEV_GUILD_ID },
        'Successfully cleared test guild commands',
      );
    } else if (flag === '--clear-global') {
      logger.info('Clearing global application commands...');
      await rest.put(Routes.applicationCommands(config.CLIENT_ID), {
        body: [],
      });
      logger.info('Successfully cleared global commands');
    }
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to execute command deployment');
    process.exit(1);
  }
}

main();
