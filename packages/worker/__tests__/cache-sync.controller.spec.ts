import { Test, type TestingModule } from "@nestjs/testing";
import type { RmqContext } from "@nestjs/microservices";
import {
	EventType,
	type DashboardSettingsUpdatedPayload,
	type RobotmanEvent,
} from "@robotman/shared";

import { CacheSyncController } from "../src/redis/cache-sync.controller";
import { CacheService } from "../src/redis/cache.service";

describe("CacheSyncController", () => {
	let controller: CacheSyncController;
	let cacheService: {
		deletePrefix: jest.Mock<Promise<number>, [string]>;
		setPrefix: jest.Mock<Promise<"OK">, [string, string]>;
	};

	const rmqContext = {
		getPattern: jest.fn().mockReturnValue(EventType.DASHBOARD_SETTINGS_UPDATED),
	} as unknown as RmqContext;

	beforeEach(async () => {
		cacheService = {
			deletePrefix: jest.fn<Promise<number>, [string]>(),
			setPrefix: jest.fn<Promise<"OK">, [string, string]>(),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [CacheSyncController],
			providers: [
				{
					provide: CacheService,
					useValue: cacheService,
				},
			],
		}).compile();

		controller = module.get<CacheSyncController>(CacheSyncController);
	});

	it("writes a new prefix to Redis when dashboard settings are updated", async () => {
		cacheService.setPrefix.mockResolvedValue("OK");

		const event: RobotmanEvent<DashboardSettingsUpdatedPayload> = {
			eventId: "event-1",
			payload: {
				auditLogChannelId: null,
				guildId: "guild-123",
				isRankingEnabled: true,
				prefix: "!",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DASHBOARD_SETTINGS_UPDATED,
		};

		await controller.syncGuildPrefix(event, rmqContext);

		expect(cacheService.setPrefix).toHaveBeenCalledWith("guild-123", "!");
		expect(cacheService.deletePrefix).not.toHaveBeenCalled();
	});

	it("removes the cached prefix when dashboard settings clear it", async () => {
		cacheService.deletePrefix.mockResolvedValue(1);

		const event: RobotmanEvent<DashboardSettingsUpdatedPayload> = {
			eventId: "event-2",
			payload: {
				auditLogChannelId: null,
				guildId: "guild-456",
				isRankingEnabled: false,
				prefix: null,
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DASHBOARD_SETTINGS_UPDATED,
		};

		await controller.syncGuildPrefix(event, rmqContext);

		expect(cacheService.deletePrefix).toHaveBeenCalledWith("guild-456");
		expect(cacheService.setPrefix).not.toHaveBeenCalled();
	});
});
