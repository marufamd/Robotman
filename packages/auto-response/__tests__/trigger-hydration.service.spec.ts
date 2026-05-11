import { Test, type TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";

import { RedisCacheService, type CachedTrigger } from "../src/redis/cache.service";
import { TriggerHydrationService } from "../src/hydration/trigger-hydration.service";

describe("TriggerHydrationService", () => {
	let service: TriggerHydrationService;
	let redisCacheService: {
		setTriggers: jest.Mock<Promise<"OK">, [string, CachedTrigger[]]>;
	};
	const originalEnv = { ...process.env };
	const originalFetch = global.fetch;

	beforeEach(async () => {
		process.env = {
			...originalEnv,
			INTERNAL_API_BASE_URL: "http://api:3001",
			INTERNAL_SERVICE_TOKEN: "internal-token",
			TRIGGER_HYDRATION_MAX_ATTEMPTS: "1",
			TRIGGER_HYDRATION_RETRY_DELAY_MS: "1",
		};

		redisCacheService = {
			setTriggers: jest.fn().mockResolvedValue("OK"),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TriggerHydrationService,
				{
					provide: RedisCacheService,
					useValue: redisCacheService,
				},
			],
		}).compile();

		service = module.get<TriggerHydrationService>(TriggerHydrationService);
	});

	afterEach(() => {
		process.env = originalEnv;
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it("hydrates grouped trigger snapshot into Redis cache", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				guilds: [
					{
						guildId: "guild-1",
						triggers: [
							{
								responseId: "response-1",
								name: "ping",
								aliases: ["pong"],
								content: "hello",
								wildcard: false,
							},
						],
					},
					{
						guildId: "guild-2",
						triggers: [
							{
								responseId: "response-2",
								name: "hello*world",
								aliases: [],
								content: "wild",
								wildcard: true,
							},
						],
					},
				],
			}),
			ok: true,
		}) as typeof fetch;

		await service.hydrate();

		expect(global.fetch).toHaveBeenCalledWith(
			new URL("/internal/auto-responses/cache-snapshot", "http://api:3001"),
			{
				headers: {
					"X-Internal-Service-Token": "internal-token",
				},
			},
		);
		expect(redisCacheService.setTriggers).toHaveBeenNthCalledWith(1, "guild-1", [
			{
				content: "hello",
				patterns: ["ping", "pong"],
				responseId: "response-1",
				wildcard: false,
			},
		]);
		expect(redisCacheService.setTriggers).toHaveBeenNthCalledWith(2, "guild-2", [
			{
				content: "wild",
				patterns: ["hello*world"],
				responseId: "response-2",
				wildcard: true,
			},
		]);
	});

	it("skips empty guild trigger lists", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				guilds: [
					{
						guildId: "guild-1",
						triggers: [],
					},
				],
			}),
			ok: true,
		}) as typeof fetch;

		await service.hydrate();

		expect(redisCacheService.setTriggers).not.toHaveBeenCalled();
	});

	it("logs hydration failures without throwing", async () => {
		const loggerError = jest.spyOn(Logger.prototype, "error").mockImplementation();

		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			status: 403,
		}) as typeof fetch;

		await expect(service.hydrate()).resolves.toBeUndefined();
		expect(redisCacheService.setTriggers).not.toHaveBeenCalled();
		expect(loggerError).toHaveBeenCalledWith(
			"Failed to hydrate auto-response trigger cache: Trigger snapshot request failed with status 403",
		);
	});
});
