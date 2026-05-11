import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";

import { REDIS_CLIENT } from "./redis.constants";

export interface RedisKeyValueStore {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<"OK">;
	del(...keys: string[]): Promise<number>;
	keys(pattern: string): Promise<string[]>;
	quit(): Promise<"OK">;
}

const GUILD_PREFIX_CACHE_KEY = "guild:prefix";
const GUILD_RANKING_ENABLED_CACHE_KEY = "guild:ranking-enabled";

export const buildGuildPrefixCacheKey = (guildId: string): string =>
	`${GUILD_PREFIX_CACHE_KEY}:${guildId}`;

export const buildGuildRankingEnabledCacheKey = (guildId: string): string =>
	`${GUILD_RANKING_ENABLED_CACHE_KEY}:${guildId}`;

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

	public async del(...keys: string[]): Promise<number> {
		if (keys.length === 0) {
			return 0;
		}

		return this.redisClient.del(...keys);
	}

	public async keys(pattern: string): Promise<string[]> {
		return this.redisClient.keys(pattern);
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

	public async isRankingEnabled(guildId: string): Promise<boolean> {
		return (await this.get(buildGuildRankingEnabledCacheKey(guildId))) === "1";
	}

	public async setRankingEnabled(guildId: string): Promise<"OK"> {
		return this.set(buildGuildRankingEnabledCacheKey(guildId), "1");
	}

	public async deleteRankingEnabled(guildId: string): Promise<number> {
		return this.del(buildGuildRankingEnabledCacheKey(guildId));
	}

	public async clearGuildSettingsCache(): Promise<number> {
		const keys = await Promise.all([
			this.keys(`${GUILD_PREFIX_CACHE_KEY}:*`),
			this.keys(`${GUILD_RANKING_ENABLED_CACHE_KEY}:*`),
		]);

		return this.del(...keys.flat());
	}

	public async onModuleDestroy(): Promise<void> {
		await this.redisClient.quit();
	}
}

export { CacheService as RedisCacheService };
