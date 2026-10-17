import type { APIApplicationCommandInteraction, APIMessageComponentInteraction, APIModalSubmitInteraction, APIInteractionResponse, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import type { Sql } from 'postgres';

export type CommandInteraction = APIApplicationCommandInteraction | APIMessageComponentInteraction | APIModalSubmitInteraction;
export interface CommandContext {
  sql: Sql;
  fetch: typeof globalThis.fetch;
  startedAt: number;
  applicationId?: string;
  botToken?: string;
  queueFollowup?(data: Record<string, unknown>): void;
}
export interface CommandModule {
  commands: RESTPostAPIChatInputApplicationCommandsJSONBody[];
  matches(interaction: CommandInteraction): boolean;
  handle(interaction: CommandInteraction, context: CommandContext): Promise<APIInteractionResponse>;
  start?(context: CommandContext): Promise<void>;
  close?(): Promise<void>;
}
