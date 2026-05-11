import { Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";

import { GuildSettingsHydrationService } from "../src/hydration/guild-settings-hydration.service";
import { RedisCacheService } from "../src/redis/cache.service";

describe("GuildSettingsHydrationService", () => {
	let service: GuildSettingsHydrationService;
	let redisCacheService: {
		clearGuildSettingsCache: jest.Mock<Promise<number>, []>;
		setPrefix: jest.Mock<Promise<"OK">, [string, string]>;
		setRankingEnabled: jest.Mock<Promise<"OK">, [string]>;
	};
	const originalEnv = { ...process.env };
	const originalFetch = global.fetch;

	beforeEach(async () => {
		process.env = {
			...originalEnv,
			GUILD_SETTINGS_HYDRATION_MAX_ATTEMPTS: "1",
			GUILD_SETTINGS_HYDRATION_RETRY_DELAY_MS: "1",
			INTERNAL_API_BASE_URL: "http://api:3001",
			INTERNAL_SERVICE_TOKEN: "internal-token",
		};

		redisCacheService = {
			clearGuildSettingsCache: jest.fn().mockResolvedValue(0),
			setPrefix: jest.fn().mockResolvedValue("OK"),
			setRankingEnabled: jest.fn().mockResolvedValue("OK"),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				GuildSettingsHydrationService,
				{
					provide: RedisCacheService,
					useValue: redisCacheService,
				},
			],
		}).compile();

		service = module.get<GuildSettingsHydrationService>(
			GuildSettingsHydrationService,
		);
	});

	afterEach(() => {
		process.env = originalEnv;
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it("hydrates guild prefix and ranking settings into Redis", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				guilds: [
					{
						guildId: "guild-1",
						isRankingEnabled: true,
						prefix: "!",
					},
					{
						guildId: "guild-2",
						isRankingEnabled: false,
						prefix: null,
					},
				],
			}),
			ok: true,
		}) as typeof fetch;

		await service.hydrate();

		expect(global.fetch).toHaveBeenCalledWith(
			new URL("/internal/guild-settings/cache-snapshot", "http://api:3001"),
			{
				headers: {
					"X-Internal-Service-Token": "internal-token",
				},
			},
		);
		expect(redisCacheService.clearGuildSettingsCache).toHaveBeenCalledTimes(1);
		expect(redisCacheService.setPrefix).toHaveBeenCalledWith("guild-1", "!");
		expect(redisCacheService.setRankingEnabled).toHaveBeenCalledWith("guild-1");
		expect(redisCacheService.setPrefix).toHaveBeenCalledTimes(1);
		expect(redisCacheService.setRankingEnabled).toHaveBeenCalledTimes(1);
	});

	it("logs hydration failures without throwing", async () => {
		const loggerError = jest.spyOn(Logger.prototype, "error").mockImplementation();

		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			status: 403,
		}) as typeof fetch;

		await expect(service.hydrate()).resolves.toBeUndefined();
		expect(redisCacheService.clearGuildSettingsCache).not.toHaveBeenCalled();
		expect(loggerError).toHaveBeenCalledWith(
			"Failed to hydrate worker guild settings cache: Guild settings snapshot request failed with status 403",
		);
	});
});
