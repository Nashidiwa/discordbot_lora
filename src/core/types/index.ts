import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  ClientEvents,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

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
