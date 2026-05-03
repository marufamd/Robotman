import { Injectable } from "@nestjs/common";
import {
	ArgumentStream,
	Lexer,
	Parser,
	PrefixedStrategy,
	join,
} from "@sapphire/lexure";

import { RedisCacheService } from "../redis/cache.service";
import type {
	CommandArgumentDefinition,
	CommandArgumentDefaultValue,
	CommandArgumentResolutionContext,
	CommandArgumentResolver,
	CommandArgumentType,
	CommandArgumentTypeName,
	PrefixCommandDefinition,
} from "../commands/command-handler";

export interface ParsedCommand<
	TArgs extends Record<string, unknown> = Record<string, unknown>,
> {
	alias: string;
	args: TArgs;
	commandName: string;
	orderedArgs: string[];
	prefix: string;
	remainder: string;
}

const DEFAULT_PREFIX = "!";
const QUOTES: Array<[string, string]> = [
	['"', '"'],
	["“", "”"],
];
const OPTION_PREFIXES = ["--"] as const;
const OPTION_SEPARATORS = ["=", ":"] as const;

const COMMAND_ARGUMENT_MATCH_DEFAULT = "single";
const COMMAND_ARGUMENT_TYPE_DEFAULT = "string";

type ParsedCommandArguments = Record<string, unknown>;

const COMMAND_ARGUMENT_RESOLVERS: Record<
	CommandArgumentTypeName,
	CommandArgumentResolver
> = {
	integer: (value) => {
		const parsed = Number.parseInt(value, 10);

		return Number.isNaN(parsed) ? null : parsed;
	},
	lowercase: (value) => value.toLowerCase(),
	number: (value) => {
		const parsed = Number.parseFloat(value);

		return Number.isNaN(parsed) ? null : parsed;
	},
	string: (value) => value,
	uppercase: (value) => value.toUpperCase(),
};

@Injectable()
export class CommandParserService {
	private readonly lexer = new Lexer({
		quotes: QUOTES,
	});

	private readonly parser = new Parser(
		new PrefixedStrategy(OPTION_PREFIXES, OPTION_SEPARATORS),
	);

	public constructor(
		private readonly redisCacheService: RedisCacheService,
	) {}

	public async parseMessage(
		content: string,
		guildId: string,
		isBot: boolean,
		commands: readonly PrefixCommandDefinition[],
		userId = "",
	): Promise<ParsedCommand | null> {
		if (isBot) {
			return null;
		}

		const prefix = (await this.redisCacheService.getPrefix(guildId)) ?? DEFAULT_PREFIX;

		if (!content.startsWith(prefix)) {
			return null;
		}

		const trimmedCommand = content.slice(prefix.length).trim();

		if (trimmedCommand.length === 0) {
			return null;
		}

		const argumentStream = new ArgumentStream(
			this.parser.run(this.lexer.run(trimmedCommand)),
		);
		const aliasToken = argumentStream.single();

		if (aliasToken.isNone()) {
			return null;
		}

		const alias = aliasToken.unwrap().toLowerCase();
		const commandDefinition = this.findCommandDefinition(alias, commands);

		if (!commandDefinition) {
			return null;
		}

		const fullState = argumentStream.save();
		const orderedParameters = argumentStream.many();
		const orderedArgs = orderedParameters.isSome()
			? orderedParameters.unwrap().map((parameter) => parameter.value)
			: [];
		const remainder = orderedParameters.isSome()
			? join(orderedParameters.unwrap())
			: "";

		argumentStream.restore(fullState);

		const args = await this.parseArguments(
			argumentStream,
			commandDefinition,
			{
				commandName: commandDefinition.name,
				guildId,
				userId,
			},
			fullState,
		);

		if (args === null) {
			return null;
		}

		return {
			alias,
			args,
			commandName: commandDefinition.name.toLowerCase(),
			orderedArgs,
			prefix,
			remainder,
		};
	}

	private findCommandDefinition(
		alias: string,
		commands: readonly PrefixCommandDefinition[],
	): PrefixCommandDefinition | null {
		for (const command of commands) {
			if (command.name.toLowerCase() === alias) {
				return command;
			}

			if (
				command.aliases?.some(
					(commandAlias) => commandAlias.toLowerCase() === alias,
				)
			) {
				return command;
			}
		}

		return null;
	}

	private async parseArguments(
		argumentStream: ArgumentStream,
		commandDefinition: PrefixCommandDefinition,
		context: CommandArgumentResolutionContext,
		fullState: ArgumentStream.State,
	): Promise<ParsedCommandArguments | null> {
		const parsedArguments: ParsedCommandArguments = {};

		for (const commandArgumentDefinition of commandDefinition.args ?? []) {
			const resolvedArgument = await this.parseArgument(
				argumentStream,
				commandArgumentDefinition,
				context,
				fullState,
			);

			if (resolvedArgument === null) {
				return null;
			}

			parsedArguments[commandArgumentDefinition.name] = resolvedArgument;
		}

		return parsedArguments;
	}

	private async parseArgument(
		argumentStream: ArgumentStream,
		commandArgumentDefinition: CommandArgumentDefinition,
		context: CommandArgumentResolutionContext,
		fullState: ArgumentStream.State,
	): Promise<unknown | null> {
		const match =
			commandArgumentDefinition.match ?? COMMAND_ARGUMENT_MATCH_DEFAULT;
		const rawValue = this.readRawArgument(
			argumentStream,
			commandArgumentDefinition,
			fullState,
			match,
		);

		if (match === "flag") {
			return Boolean(rawValue);
		}

		if (rawValue === null) {
			return this.resolveMissingArgument(commandArgumentDefinition, context);
		}

		if (typeof rawValue !== "string") {
			return this.resolveMissingArgument(commandArgumentDefinition, context);
		}

		const resolvedValue = await this.resolveArgumentValue(
			rawValue,
			commandArgumentDefinition.type ?? COMMAND_ARGUMENT_TYPE_DEFAULT,
			context,
		);

		if (resolvedValue !== null) {
			return resolvedValue;
		}

		return this.resolveMissingArgument(commandArgumentDefinition, context);
	}

	private readRawArgument(
		argumentStream: ArgumentStream,
		commandArgumentDefinition: CommandArgumentDefinition,
		fullState: ArgumentStream.State,
		match: NonNullable<CommandArgumentDefinition["match"]>,
	): boolean | string | null {
		switch (match) {
			case "single": {
				const value = argumentStream.single();

				return value.isSome() ? value.unwrap() : null;
			}

			case "rest": {
				const value = argumentStream.many();

				return value.isSome() ? join(value.unwrap()) : null;
			}

			case "content": {
				const currentState = argumentStream.save();

				argumentStream.restore(fullState);

				const value = argumentStream.many();

				argumentStream.restore(currentState);

				return value.isSome() ? join(value.unwrap()) : null;
			}

			case "flag":
				return argumentStream.flag(...(commandArgumentDefinition.flags ?? []));

			case "option": {
				const value = argumentStream.option(
					...(commandArgumentDefinition.flags ?? []),
				);

				return value.isSome() ? value.unwrap() : null;
			}
		}
	}

	private async resolveArgumentValue(
		rawValue: string,
		type: CommandArgumentType,
		context: CommandArgumentResolutionContext,
	): Promise<unknown | null> {
		const resolver =
			typeof type === "string" ? COMMAND_ARGUMENT_RESOLVERS[type] : type;

		return resolver(rawValue, context);
	}

	private resolveMissingArgument(
		commandArgumentDefinition: CommandArgumentDefinition,
		context: CommandArgumentResolutionContext,
	): unknown | null {
		if (typeof commandArgumentDefinition.default !== "undefined") {
			return this.resolveDefaultValue(commandArgumentDefinition.default, context);
		}

		if (commandArgumentDefinition.required) {
			return null;
		}

		return undefined;
	}

	private resolveDefaultValue(
		defaultValue: CommandArgumentDefaultValue,
		context: CommandArgumentResolutionContext,
	): unknown {
		return typeof defaultValue === "function"
			? defaultValue(context)
			: defaultValue;
	}
}
