import { Injectable } from "@nestjs/common";

import type {
	CommandHandler,
	PrefixCommandExecutionContext,
	PrefixCommandExecutionResult,
	SlashCommandExecutionContext,
	SlashCommandExecutionResult,
} from "../../command-handler";
import { PingService } from "./ping.service";

@Injectable()
export class PingCommand implements CommandHandler {
	public readonly definition = {
		name: "ping",
		prefix: {
			aliases: ["pong"],
		},
		slash: {},
	} as const;

	public constructor(private readonly pingService: PingService) {}

	public executePrefix(
		_context: PrefixCommandExecutionContext,
	): PrefixCommandExecutionResult {
		const result = this.pingService.execute();

		return {
			embeds: result.embeds,
		};
	}

	public executeSlash(
		_context: SlashCommandExecutionContext,
	): SlashCommandExecutionResult {
		const result = this.pingService.execute();

		return {
			embeds: result.embeds,
		};
	}
}
