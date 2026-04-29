import { Injectable } from "@nestjs/common";

import { RedisCacheService } from "../redis/cache.service";

export interface ParsedCommand {
	commandName: string;
	args: string[];
}

const DEFAULT_PREFIX = "!";

@Injectable()
export class CommandParserService {
	public constructor(
		private readonly redisCacheService: RedisCacheService,
	) {}

	public async parseMessage(
		content: string,
		guildId: string,
		isBot: boolean,
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

		const [commandName, ...args] = trimmedCommand.split(/\s+/u);

		return {
			args,
			commandName: commandName.toLowerCase(),
		};
	}
}
