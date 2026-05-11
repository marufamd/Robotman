import { Test, type TestingModule } from "@nestjs/testing";
import {
	EventType,
	type DiscordMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";

import { RedisCacheService } from "../src/redis/cache.service";
import { RankingRepository } from "../src/ranking/ranking.repository";
import { RankingService } from "../src/ranking/ranking.service";

describe("RankingService", () => {
	let service: RankingService;
	let rankingRepository: {
		getLeaderboardPage: jest.Mock;
		getRankedUser: jest.Mock;
		recordMessage: jest.Mock;
		upsertColor: jest.Mock;
	};
	let redisCacheService: {
		getPrefix: jest.Mock;
		isRankingEnabled: jest.Mock;
	};

	const baseEvent: RobotmanEvent<DiscordMessagePayload> = {
		eventId: "event-1",
		payload: {
			channelId: "channel-1",
			content: "hello",
			guildId: "guild-1",
			guildIconUrl: "",
			guildName: "Guild One",
			isBot: false,
			isSystem: false,
			memberDisplayName: "Robotman",
			messageId: "message-1",
			timestamp: "2026-05-10T00:00:00.000Z",
			userId: "user-1",
			webhookId: null,
		},
		timestamp: "2026-05-10T00:00:00.000Z",
		type: EventType.DISCORD_MESSAGE,
	};

	beforeEach(async () => {
		rankingRepository = {
			getLeaderboardPage: jest.fn(),
			getRankedUser: jest.fn(),
			recordMessage: jest.fn().mockResolvedValue(undefined),
			upsertColor: jest.fn().mockResolvedValue(undefined),
		};
		redisCacheService = {
			getPrefix: jest.fn().mockResolvedValue("?"),
			isRankingEnabled: jest.fn().mockResolvedValue(true),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RankingService,
				{
					provide: RankingRepository,
					useValue: rankingRepository,
				},
				{
					provide: RedisCacheService,
					useValue: redisCacheService,
				},
			],
		}).compile();

		service = module.get<RankingService>(RankingService);
	});

	it("skips messages from bots, system messages, and webhooks", async () => {
		await service.trackMessage({
			...baseEvent,
			payload: {
				...baseEvent.payload,
				isBot: true,
			},
		});
		await service.trackMessage({
			...baseEvent,
			payload: {
				...baseEvent.payload,
				isSystem: true,
			},
		});
		await service.trackMessage({
			...baseEvent,
			payload: {
				...baseEvent.payload,
				webhookId: "webhook-1",
			},
		});

		expect(redisCacheService.isRankingEnabled).not.toHaveBeenCalled();
		expect(rankingRepository.recordMessage).not.toHaveBeenCalled();
	});

	it("skips guilds where ranking is disabled", async () => {
		redisCacheService.isRankingEnabled.mockResolvedValue(false);

		await service.trackMessage(baseEvent);

		expect(redisCacheService.isRankingEnabled).toHaveBeenCalledWith("guild-1");
		expect(rankingRepository.recordMessage).not.toHaveBeenCalled();
	});

	it("awards message xp using event timestamp when ranking is enabled", async () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		await service.trackMessage(baseEvent);

		expect(rankingRepository.recordMessage).toHaveBeenCalledWith({
			displayName: "Robotman",
			guildId: "guild-1",
			timestamp: "2026-05-10T00:00:00.000Z",
			userId: "user-1",
			xp: 10,
		});
	});

	it("skips invalid timestamps", async () => {
		await service.trackMessage({
			...baseEvent,
			payload: {
				...baseEvent.payload,
				timestamp: "not-a-date",
			},
		});

		expect(rankingRepository.recordMessage).not.toHaveBeenCalled();
	});

	it("delegates leaderboard page queries per guild", async () => {
		rankingRepository.getLeaderboardPage.mockResolvedValue([]);

		await service.getLeaderboardPage({
			guildId: "guild-9",
			page: 2,
		});

		expect(rankingRepository.getLeaderboardPage).toHaveBeenCalledWith({
			guildId: "guild-9",
			limit: 10,
			offset: 10,
		});
	});

	it("upserts leaderboard color rows", async () => {
		await service.setColor({
			color: 0xffb700,
			displayName: "Robotman",
			guildId: "guild-3",
			userId: "user-3",
		});

		expect(rankingRepository.upsertColor).toHaveBeenCalledWith({
			color: 0xffb700,
			displayName: "Robotman",
			guildId: "guild-3",
			userId: "user-3",
		});
	});
});
