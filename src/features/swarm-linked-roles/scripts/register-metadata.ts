import { logger } from '../../../core/logger.js';
import { SwarmMetadataService } from '../services/swarm-metadata.service.js';
import { swarmConfig } from '../swarm.config.js';

async function main(): Promise<void> {
  process.stdout.write(`
===================================================================
  Lora - Register Application Role Connection Metadata
===================================================================
  Target Application ID: ${swarmConfig.CLIENT_ID}
  Metadata Schema: swarm_level (Integer Equal: 1..8)
===================================================================
\n`);

  try {
    await SwarmMetadataService.registerApplicationMetadataSchema();
    process.stdout.write(
      '✅ Successfully registered Swarm Level Metadata Schema on Discord API!\n\n',
    );
    process.exit(0);
  } catch (error) {
    logger.error(
      { error },
      'Fatal error registering Discord metadata schema',
    );
    process.stderr.write(
      `❌ Failed to register metadata schema: ${error instanceof Error ? error.message : String(error)}\n\n`,
    );
    process.exit(1);
  }
}

void main();
