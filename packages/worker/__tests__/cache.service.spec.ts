import { Test, type TestingModule } from "@nestjs/testing";

import {
	buildGuildPrefixCacheKey,
	CacheService,
	type RedisKeyValueStore,
} from "../src/redis/cache.service";
import { REDIS_CLIENT } from "../src/redis/redis.constants";

describe("CacheService", () => {
	let service: CacheService;
	let redisClient: jest.Mocked<RedisKeyValueStore>;

	beforeEach(async () => {
		redisClient = {
			del: jest.fn<Promise<number>, [string]>(),
			get: jest.fn<Promise<string | null>, [string]>(),
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

	it("closes the Redis client on module shutdown", async () => {
		await service.onModuleDestroy();

		expect(redisClient.quit).toHaveBeenCalledTimes(1);
	});
});
