import {
  Client,
  type ClientOptions,
  Collection,
  GatewayIntentBits,
} from 'discord.js';
import { type AsyncEventBus, eventBus } from './bus.js';
import type { BotCommand } from './types/index.js';

export class ExtendedClient extends Client {
  public readonly commands: Collection<string, BotCommand> = new Collection();
  public readonly bus: AsyncEventBus = eventBus;

  constructor(options?: ClientOptions) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
      ...options,
    });
  }
}
