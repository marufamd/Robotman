import { Injectable } from "@nestjs/common";

import {
	RedisCacheService,
	type CachedTrigger,
} from "../redis/cache.service";

const escapeRegexCharacters = (value: string): string =>
	value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

const wildcardToRegex = (pattern: string): RegExp =>
	new RegExp(
		`^${escapeRegexCharacters(pattern).replace(/\\\*/g, ".*").replace(/\\\?/g, ".")}$`,
		"iu",
	);

const triggerToRegex = (trigger: CachedTrigger, pattern: string): RegExp =>
	trigger.wildcard ? wildcardToRegex(pattern) : new RegExp(pattern, "iu");

@Injectable()
export class ScannerService {
	public constructor(
		private readonly redisCacheService: RedisCacheService,
	) {}

	public async findReply(
		content: string,
		guildId: string,
		isBot: boolean,
	): Promise<string | null> {
		if (isBot) {
			return null;
		}

		const triggers = await this.redisCacheService.getTriggers(guildId);

		if (!triggers || triggers.length === 0) {
			return null;
		}

		for (const trigger of triggers) {
			for (const pattern of trigger.patterns) {
				try {
					if (triggerToRegex(trigger, pattern).test(content)) {
						return trigger.content;
					}
				} catch {
					continue;
				}
			}
		}

		return null;
	}
}
