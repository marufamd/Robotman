import { Inject, Injectable } from "@nestjs/common";

import { COMMAND_HANDLERS } from "./commands.constants";
import type {
	CommandDefinition,
	CommandHandler,
	PrefixCommandDefinition,
} from "./command-handler";

@Injectable()
export class CommandsRegistryService {
	private readonly commandDefinitions: PrefixCommandDefinition[];

	private readonly handlersByName: Map<string, CommandHandler>;

	private readonly handlersBySlashName: Map<string, CommandHandler>;

	public constructor(
		@Inject(COMMAND_HANDLERS)
		commandHandlers: readonly CommandHandler[],
	) {
		this.commandDefinitions = [];
		this.handlersByName = new Map();
		this.handlersBySlashName = new Map();

		for (const commandHandler of commandHandlers) {
			this.registerCommand(commandHandler);
		}
	}

	public getPrefixCommandDefinitions(): readonly PrefixCommandDefinition[] {
		return this.commandDefinitions;
	}

	public getCommandHandler(
		commandName: string,
	): CommandHandler | null {
		return this.handlersByName.get(commandName) ?? null;
	}

	public getSlashCommandHandler(
		commandName: string,
	): CommandHandler | null {
		return this.handlersBySlashName.get(commandName) ?? null;
	}

	private registerCommand(commandHandler: CommandHandler): void {
		const canonicalName = commandHandler.definition.name.toLowerCase();

		if (this.handlersByName.has(canonicalName)) {
			throw new Error(`Duplicate command handler registered for "${canonicalName}".`);
		}

		this.handlersByName.set(canonicalName, commandHandler);

		if (commandHandler.definition.prefix) {
			this.commandDefinitions.push(
				this.buildPrefixDefinition(commandHandler.definition),
			);
		}

		if (commandHandler.definition.slash) {
			const slashName = (
				commandHandler.definition.slash.name ?? commandHandler.definition.name
			).toLowerCase();

			if (this.handlersBySlashName.has(slashName)) {
				throw new Error(`Duplicate slash command handler registered for "${slashName}".`);
			}

			this.handlersBySlashName.set(slashName, commandHandler);
		}
	}

	private buildPrefixDefinition(
		commandDefinition: CommandDefinition,
	): PrefixCommandDefinition {
		return {
			aliases: commandDefinition.prefix?.aliases,
			args: commandDefinition.prefix?.args,
			name: commandDefinition.name,
		};
	}
}
