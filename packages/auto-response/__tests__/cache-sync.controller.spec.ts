import { Test, type TestingModule } from "@nestjs/testing";
import type { RmqContext } from "@nestjs/microservices";
import {
	EventType,
	type DashboardResponseUpdatedPayload,
	type RobotmanEvent,
} from "@robotman/shared";

import { CacheSyncController } from "../src/redis/cache-sync.controller";
import { CacheService, type CachedTrigger } from "../src/redis/cache.service";

describe("CacheSyncController", () => {
	let controller: CacheSyncController;
	let cacheService: {
		deleteTriggers: jest.Mock<Promise<number>, [string]>;
		getTriggers: jest.Mock<Promise<CachedTrigger[] | null>, [string]>;
		setTriggers: jest.Mock<Promise<"OK">, [string, CachedTrigger[]]>;
	};

	const rmqContext = {} as RmqContext;

	beforeEach(async () => {
		cacheService = {
			deleteTriggers: jest.fn<Promise<number>, [string]>(),
			getTriggers: jest.fn<Promise<CachedTrigger[] | null>, [string]>(),
			setTriggers: jest.fn<Promise<"OK">, [string, CachedTrigger[]]>(),
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

	it("adds a new cached trigger on create events", async () => {
		cacheService.getTriggers.mockResolvedValue(null);
		cacheService.setTriggers.mockResolvedValue("OK");

		const event: RobotmanEvent<DashboardResponseUpdatedPayload> = {
			eventId: "event-1",
			payload: {
				action: "CREATE",
				guildId: "guild-1",
				responseId: "response-1",
				data: {
					aliases: ["bye"],
					content: "hello there",
					embed: false,
					embedColor: null,
					name: "^hi$",
					type: "text",
					wildcard: false,
				},
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DASHBOARD_RESPONSE_UPDATED,
		};

		await controller.syncGuildTriggers(event, rmqContext);

		expect(cacheService.setTriggers).toHaveBeenCalledWith("guild-1", [
			{
				content: "hello there",
				patterns: ["^hi$", "bye"],
				responseId: "response-1",
				wildcard: false,
			},
		]);
	});

	it("replaces an existing cached trigger on update events", async () => {
		cacheService.getTriggers.mockResolvedValue([
			{
				content: "old",
				patterns: ["old"],
				responseId: "response-1",
				wildcard: false,
			},
			{
				content: "keep",
				patterns: ["keep"],
				responseId: "response-2",
				wildcard: false,
			},
		]);
		cacheService.setTriggers.mockResolvedValue("OK");

		const event: RobotmanEvent<DashboardResponseUpdatedPayload> = {
			eventId: "event-2",
			payload: {
				action: "UPDATE",
				guildId: "guild-1",
				responseId: "response-1",
				data: {
					aliases: [],
					content: "new",
					embed: false,
					embedColor: null,
					name: "hello*",
					type: "text",
					wildcard: true,
				},
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DASHBOARD_RESPONSE_UPDATED,
		};

		await controller.syncGuildTriggers(event, rmqContext);

		expect(cacheService.setTriggers).toHaveBeenCalledWith("guild-1", [
			{
				content: "keep",
				patterns: ["keep"],
				responseId: "response-2",
				wildcard: false,
			},
			{
				content: "new",
				patterns: ["hello*"],
				responseId: "response-1",
				wildcard: true,
			},
		]);
	});

	it("removes only the deleted trigger when others remain", async () => {
		cacheService.getTriggers.mockResolvedValue([
			{
				content: "one",
				patterns: ["one"],
				responseId: "response-1",
				wildcard: false,
			},
			{
				content: "two",
				patterns: ["two"],
				responseId: "response-2",
				wildcard: false,
			},
		]);
		cacheService.setTriggers.mockResolvedValue("OK");

		const event: RobotmanEvent<DashboardResponseUpdatedPayload> = {
			eventId: "event-3",
			payload: {
				action: "DELETE",
				guildId: "guild-1",
				responseId: "response-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DASHBOARD_RESPONSE_UPDATED,
		};

		await controller.syncGuildTriggers(event, rmqContext);

		expect(cacheService.setTriggers).toHaveBeenCalledWith("guild-1", [
			{
				content: "two",
				patterns: ["two"],
				responseId: "response-2",
				wildcard: false,
			},
		]);
		expect(cacheService.deleteTriggers).not.toHaveBeenCalled();
	});

	it("deletes the guild cache key when the last trigger is removed", async () => {
		cacheService.getTriggers.mockResolvedValue([
			{
				content: "one",
				patterns: ["one"],
				responseId: "response-1",
				wildcard: false,
			},
		]);
		cacheService.deleteTriggers.mockResolvedValue(1);

		const event: RobotmanEvent<DashboardResponseUpdatedPayload> = {
			eventId: "event-4",
			payload: {
				action: "DELETE",
				guildId: "guild-1",
				responseId: "response-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DASHBOARD_RESPONSE_UPDATED,
		};

		await controller.syncGuildTriggers(event, rmqContext);

		expect(cacheService.deleteTriggers).toHaveBeenCalledWith("guild-1");
		expect(cacheService.setTriggers).not.toHaveBeenCalled();
	});
});
