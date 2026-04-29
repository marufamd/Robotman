import { Test, type TestingModule } from "@nestjs/testing";

import {
	buildGuildTriggerCacheKey,
	CacheService,
	type CachedTrigger,
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

	it("returns null on trigger cache miss", async () => {
		redisClient.get.mockResolvedValue(null);

		await expect(service.getTriggers("guild-1")).resolves.toBeNull();
		expect(redisClient.get).toHaveBeenCalledWith(
			buildGuildTriggerCacheKey("guild-1"),
		);
	});

	it("parses cached trigger arrays from Redis", async () => {
		const triggers: CachedTrigger[] = [
			{
				content: "hello",
				patterns: ["^ping$"],
				responseId: "response-1",
				wildcard: false,
			},
		];
		redisClient.get.mockResolvedValue(JSON.stringify(triggers));

		await expect(service.getTriggers("guild-2")).resolves.toEqual(triggers);
	});

	it("serializes trigger arrays back into Redis", async () => {
		const triggers: CachedTrigger[] = [
			{
				content: "hello",
				patterns: ["hello*"],
				responseId: "response-2",
				wildcard: true,
			},
		];
		redisClient.set.mockResolvedValue("OK");

		await expect(service.setTriggers("guild-3", triggers)).resolves.toBe("OK");
		expect(redisClient.set).toHaveBeenCalledWith(
			buildGuildTriggerCacheKey("guild-3"),
			JSON.stringify(triggers),
		);
	});

	it("deletes guild trigger cache keys", async () => {
		redisClient.del.mockResolvedValue(1);

		await expect(service.deleteTriggers("guild-4")).resolves.toBe(1);
		expect(redisClient.del).toHaveBeenCalledWith(
			buildGuildTriggerCacheKey("guild-4"),
		);
	});

	it("closes the Redis client on module shutdown", async () => {
		await service.onModuleDestroy();

		expect(redisClient.quit).toHaveBeenCalledTimes(1);
	});
});
