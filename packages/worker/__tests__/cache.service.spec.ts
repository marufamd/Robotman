import { Test, type TestingModule } from "@nestjs/testing";

import {
	buildGuildPrefixCacheKey,
	buildGuildRankingEnabledCacheKey,
	CacheService,
	type RedisKeyValueStore,
} from "../src/redis/cache.service";
import { REDIS_CLIENT } from "../src/redis/redis.constants";

describe("CacheService", () => {
	let service: CacheService;
	let redisClient: jest.Mocked<RedisKeyValueStore>;

	beforeEach(async () => {
		redisClient = {
			del: jest.fn<Promise<number>, string[]>(),
			get: jest.fn<Promise<string | null>, [string]>(),
			keys: jest.fn<Promise<string[]>, [string]>(),
			quit: jest.fn<Promise<"OK">, []>().mockResolvedValue("OK"),
			set: jest.fn<Promise<"OK">, [string, string]>(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CacheService,
				{
					provide: REDIS_CLIENT,
					useValue: redisClient,
				},
			],
		}).compile();

		service = module.get<CacheService>(CacheService);
	});

	it("delegates get to the Redis client", async () => {
		redisClient.get.mockResolvedValue("value");

		await expect(service.get("guild:prefix:123")).resolves.toBe("value");
		expect(redisClient.get).toHaveBeenCalledWith("guild:prefix:123");
	});

	it("delegates set to the Redis client", async () => {
		redisClient.set.mockResolvedValue("OK");

		await expect(service.set("guild:prefix:123", "!")).resolves.toBe("OK");
		expect(redisClient.set).toHaveBeenCalledWith("guild:prefix:123", "!");
	});

	it("delegates del to the Redis client", async () => {
		redisClient.del.mockResolvedValue(1);

		await expect(service.del("guild:prefix:123")).resolves.toBe(1);
		expect(redisClient.del).toHaveBeenCalledWith("guild:prefix:123");
	});

	it("loads a guild prefix from its derived cache key", async () => {
		redisClient.get.mockResolvedValue("?");

		await expect(service.getPrefix("guild-123")).resolves.toBe("?");
		expect(redisClient.get).toHaveBeenCalledWith(
			buildGuildPrefixCacheKey("guild-123"),
		);
	});

	it("stores a guild prefix at its derived cache key", async () => {
		redisClient.set.mockResolvedValue("OK");

		await expect(service.setPrefix("guild-123", "$")).resolves.toBe("OK");
		expect(redisClient.set).toHaveBeenCalledWith(
			buildGuildPrefixCacheKey("guild-123"),
			"$",
		);
	});

	it("removes a guild prefix from its derived cache key", async () => {
		redisClient.del.mockResolvedValue(1);

		await expect(service.deletePrefix("guild-123")).resolves.toBe(1);
		expect(redisClient.del).toHaveBeenCalledWith(
			buildGuildPrefixCacheKey("guild-123"),
		);
	});

	it("checks whether ranking is enabled for a guild", async () => {
		redisClient.get.mockResolvedValue("1");

		await expect(service.isRankingEnabled("guild-777")).resolves.toBe(true);
		expect(redisClient.get).toHaveBeenCalledWith(
			buildGuildRankingEnabledCacheKey("guild-777"),
		);
	});

	it("stores a guild ranking-enabled flag", async () => {
		redisClient.set.mockResolvedValue("OK");

		await expect(service.setRankingEnabled("guild-888")).resolves.toBe("OK");
		expect(redisClient.set).toHaveBeenCalledWith(
			buildGuildRankingEnabledCacheKey("guild-888"),
			"1",
		);
	});

	it("clears worker-managed guild settings cache namespaces", async () => {
		redisClient.keys
			.mockResolvedValueOnce(["guild:prefix:guild-1"])
			.mockResolvedValueOnce(["guild:ranking-enabled:guild-1"]);
		redisClient.del.mockResolvedValue(2);

		await expect(service.clearGuildSettingsCache()).resolves.toBe(2);
		expect(redisClient.keys).toHaveBeenNthCalledWith(1, "guild:prefix:*");
		expect(redisClient.keys).toHaveBeenNthCalledWith(
			2,
			"guild:ranking-enabled:*",
		);
		expect(redisClient.del).toHaveBeenCalledWith(
			"guild:prefix:guild-1",
			"guild:ranking-enabled:guild-1",
		);
	});

	it("closes the Redis client on module shutdown", async () => {
		await service.onModuleDestroy();

		expect(redisClient.quit).toHaveBeenCalledTimes(1);
	});
});
