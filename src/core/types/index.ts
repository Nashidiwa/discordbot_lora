import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { FastifyInstance } from 'fastify';
import type { DatabaseClient } from '../../shared/db/client.js';
import type { ExtendedClient } from '../client.js';

export type BotCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface BotCommand {
  data: BotCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export type SubcommandExecutor = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

export interface BotEvent<Key extends keyof ClientEvents = keyof ClientEvents> {
  name: Key;
  once?: boolean;
  execute: (...args: ClientEvents[Key]) => Promise<void> | void;
}

export interface JobContext {
  client: ExtendedClient;
  db: DatabaseClient;
}

export interface BotJob {
  name: string;
  cronExpression: string; // Standard 5-field cron expression
  runOnInit?: boolean; // Run once immediately when bot starts
  execute: (context: JobContext) => Promise<void> | void;
}

export interface RouteContext {
  client: ExtendedClient;
  db: DatabaseClient;
}

export interface BotRoute {
  prefix?: string; // URL prefix, e.g., '/auth', '/api'
  register: (
    fastify: FastifyInstance,
    context: RouteContext,
  ) => Promise<void> | void;
}
