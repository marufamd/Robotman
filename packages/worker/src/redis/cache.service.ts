import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";

import { REDIS_CLIENT } from "./redis.constants";

export interface RedisKeyValueStore {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<"OK">;
	del(key: string): Promise<number>;
	quit(): Promise<"OK">;
}

const GUILD_PREFIX_CACHE_KEY = "guild:prefix";

export const buildGuildPrefixCacheKey = (guildId: string): string =>
	`${GUILD_PREFIX_CACHE_KEY}:${guildId}`;

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

	public async getPrefix(guildId: string): Promise<string | null> {
		return this.get(buildGuildPrefixCacheKey(guildId));
	}

	public async setPrefix(guildId: string, prefix: string): Promise<"OK"> {
		return this.set(buildGuildPrefixCacheKey(guildId), prefix);
	}

	public async deletePrefix(guildId: string): Promise<number> {
		return this.del(buildGuildPrefixCacheKey(guildId));
	}

	public async onModuleDestroy(): Promise<void> {
		await this.redisClient.quit();
	}
}

export { CacheService as RedisCacheService };
