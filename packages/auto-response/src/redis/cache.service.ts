import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";

import { REDIS_CLIENT } from "./redis.constants";

export interface RedisKeyValueStore {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<"OK">;
	del(key: string): Promise<number>;
	quit(): Promise<"OK">;
}

export interface CachedTrigger {
	responseId: string;
	patterns: string[];
	content: string;
	wildcard: boolean;
}

const GUILD_TRIGGER_CACHE_KEY = "guild:auto-response-triggers";

export const buildGuildTriggerCacheKey = (guildId: string): string =>
	`${GUILD_TRIGGER_CACHE_KEY}:${guildId}`;

@Injectable()
export class CacheService implements OnModuleDestroy {
	public constructor(
		@Inject(REDIS_CLIENT) private readonly redisClient: RedisKeyValueStore,
	) {}

	public async get(key: string): Promise<string | null> {
		return this.redisClient.get(key);
	}

	public async set(key: string, value: string): Promise<"OK"> {
		return this.redisClient.set(key, value);
	}

	public async del(key: string): Promise<number> {
		return this.redisClient.del(key);
	}

	public async getTriggers(guildId: string): Promise<CachedTrigger[] | null> {
		const value = await this.get(buildGuildTriggerCacheKey(guildId));

		if (value === null) {
			return null;
		}

		return JSON.parse(value) as CachedTrigger[];
	}

	public async setTriggers(
		guildId: string,
		triggers: CachedTrigger[],
	): Promise<"OK"> {
		return this.set(buildGuildTriggerCacheKey(guildId), JSON.stringify(triggers));
	}

	public async deleteTriggers(guildId: string): Promise<number> {
		return this.del(buildGuildTriggerCacheKey(guildId));
	}

	public async onModuleDestroy(): Promise<void> {
		await this.redisClient.quit();
	}
}

export { CacheService as RedisCacheService };
