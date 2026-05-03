import type {
	DiscordInteractionPayload,
	DiscordMessagePayload,
	OutboundInteractionReplyPayload,
	OutboundMessagePayload,
	RobotmanEvent,
} from "@robotman/shared";

import type { ParsedCommand } from "../command-parser/command-parser.service";

export type CommandArgumentMatch =
	| "content"
	| "flag"
	| "option"
	| "rest"
	| "single";

export type CommandArgumentTypeName =
	| "integer"
	| "lowercase"
	| "number"
	| "string"
	| "uppercase";

export interface CommandArgumentResolutionContext {
	commandName: string;
	guildId: string;
	userId: string;
}

export type CommandArgumentResolver = (
	value: string,
	context: CommandArgumentResolutionContext,
) => Promise<unknown | null> | unknown | null;

export type CommandArgumentDefaultValue =
	| ((context: CommandArgumentResolutionContext) => unknown)
	| unknown;

export type CommandArgumentType =
	| CommandArgumentResolver
	| CommandArgumentTypeName;

export interface CommandArgumentDefinition {
	default?: CommandArgumentDefaultValue;
	flags?: readonly string[];
	match?: CommandArgumentMatch;
	name: string;
	required?: boolean;
	type?: CommandArgumentType;
}

export interface PrefixCommandDefinition<
	TArgs extends Record<string, unknown> = Record<string, unknown>,
> {
	aliases?: readonly string[];
	args?: readonly CommandArgumentDefinition[];
	name: string;
}

export interface PrefixCommandConfig<
	TArgs extends Record<string, unknown> = Record<string, unknown>,
> {
	aliases?: readonly string[];
	args?: readonly CommandArgumentDefinition[];
}

export interface SlashCommandDefinition {
	name?: string;
}

export interface CommandDefinition<
	TPrefixArgs extends Record<string, unknown> = Record<string, unknown>,
> {
	name: string;
	prefix?: PrefixCommandConfig<TPrefixArgs>;
	slash?: SlashCommandDefinition;
}

export interface PrefixCommandExecutionContext<
	TPrefixArgs extends Record<string, unknown> = Record<string, unknown>,
> {
	event: RobotmanEvent<DiscordMessagePayload>;
	parsedCommand: ParsedCommand<TPrefixArgs>;
}

export interface SlashCommandExecutionContext {
	event: RobotmanEvent<DiscordInteractionPayload>;
}

export type PrefixCommandExecutionResult = Omit<
	OutboundMessagePayload,
	"channelId"
>;

export type SlashCommandExecutionResult = Omit<
	OutboundInteractionReplyPayload,
	"interactionId" | "interactionToken"
>;

export interface CommandHandler<
	TPrefixArgs extends Record<string, unknown> = Record<string, unknown>,
> {
	readonly definition: CommandDefinition<TPrefixArgs>;

	executePrefix?(
		context: PrefixCommandExecutionContext<TPrefixArgs>,
	): Promise<PrefixCommandExecutionResult> | PrefixCommandExecutionResult;

	executeSlash?(
		context: SlashCommandExecutionContext,
	): Promise<SlashCommandExecutionResult> | SlashCommandExecutionResult;
}
