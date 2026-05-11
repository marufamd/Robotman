import { Buffer } from "node:buffer";

import { Test, type TestingModule } from "@nestjs/testing";
import type {
	DiscordInteractionPayload,
	DiscordMessagePayload,
	RobotmanEvent,
} from "@robotman/shared";

import { LeaderboardCommand } from "../src/commands/utilities/leaderboard/leaderboard.command";
import { LeaderboardRendererService } from "../src/commands/utilities/leaderboard/leaderboard-renderer.service";
import { RankingService } from "../src/ranking/ranking.service";

describe("LeaderboardCommand", () => {
	let command: LeaderboardCommand;
	let leaderboardRendererService: {
		render: jest.Mock<Promise<Buffer>, [unknown[]]>;
	};
	let rankingService: {
		getLeaderboardPage: jest.Mock;
		getPrefixForGuild: jest.Mock;
		getRankedUser: jest.Mock;
		isRankingEnabled: jest.Mock;
		normalizePage: jest.Mock;
	};

	beforeEach(async () => {
		leaderboardRendererService = {
			render: jest.fn().mockResolvedValue(Buffer.from("png-bytes")),
		};
		rankingService = {
			getLeaderboardPage: jest.fn(),
			getPrefixForGuild: jest.fn().mockResolvedValue("?"),
			getRankedUser: jest.fn(),
			isRankingEnabled: jest.fn(),
			normalizePage: jest.fn((page: number) =>
				Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
			),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				LeaderboardCommand,
				{
					provide: LeaderboardRendererService,
					useValue: leaderboardRendererService,
				},
				{
					provide: RankingService,
					useValue: rankingService,
				},
			],
		}).compile();

		command = module.get<LeaderboardCommand>(LeaderboardCommand);
	});

	it("exposes leaderboard command metadata", () => {
		expect(command.definition).toEqual({
			name: "leaderboard",
			prefix: {
				aliases: ["top", "lb"],
				args: [
					{
						default: 1,
						name: "page",
						type: "integer",
					},
				],
			},
			slash: {},
		});
	});

	it("returns disabled message when ranking is off", async () => {
		rankingService.isRankingEnabled.mockResolvedValue(false);

		const response = await command.executeSlash({
			event: {
				eventId: "event-1",
				payload: {
					channelId: "channel-1",
					commandName: "leaderboard",
					guildId: "guild-1",
					guildIconUrl: "",
					guildName: "Guild One",
					interactionId: "interaction-1",
					interactionToken: "token-1",
					options: {},
					userId: "user-1",
				},
				timestamp: "2026-05-10T00:00:00.000Z",
				type: "discord.interaction.create",
			} as RobotmanEvent<DiscordInteractionPayload>,
		});

		expect(response).toEqual({
			content: "Ranking is not enabled for this server.",
			isEphemeral: true,
		});
	});

	it("returns empty-page message when page has no rows", async () => {
		rankingService.isRankingEnabled.mockResolvedValue(true);
		rankingService.getLeaderboardPage.mockResolvedValue([]);

		const response = await command.executePrefix({
			event: {
				eventId: "event-2",
				payload: {
					channelId: "channel-1",
					content: "!top 3",
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
				type: "discord.message.create",
			} as RobotmanEvent<DiscordMessagePayload>,
			parsedCommand: {
				alias: "top",
				args: {
					page: 3,
				},
				commandName: "leaderboard",
				orderedArgs: ["3"],
				prefix: "!",
				remainder: "3",
			},
		});

		expect(response).toEqual({
			content: "There are no entries for that page.",
		});
	});

	it("returns embed and attachment payload for ranked users", async () => {
		rankingService.isRankingEnabled.mockResolvedValue(true);
		rankingService.getLeaderboardPage.mockResolvedValue([
			{
				color: 0xffb700,
				displayName: "Robotman",
				score: 420,
				userId: "user-1",
			},
		]);
		rankingService.getRankedUser.mockResolvedValue({
			color: 0xffb700,
			displayName: "Robotman",
			position: 1,
			score: 420,
			userId: "user-1",
		});

		const response = await command.executePrefix({
			event: {
				eventId: "event-3",
				payload: {
					channelId: "channel-1",
					content: "!lb",
					guildId: "guild-1",
					guildIconUrl: "https://cdn.discordapp.com/icons/guild-1/icon.png?size=256",
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
				type: "discord.message.create",
			} as RobotmanEvent<DiscordMessagePayload>,
			parsedCommand: {
				alias: "lb",
				args: {
					page: 1,
				},
				commandName: "leaderboard",
				orderedArgs: [],
				prefix: "!",
				remainder: "",
			},
		});

		expect(leaderboardRendererService.render).toHaveBeenCalledWith([
			{
				color: 0xffb700,
				displayName: "Robotman",
				rank: 1,
				score: 420,
			},
		]);
		expect(response).toEqual({
			embeds: [
				expect.objectContaining({
					author: {
						icon_url: "https://cdn.discordapp.com/icons/guild-1/icon.png?size=256",
						name: "Guild One Leaderboard",
					},
					description:
						"You are rank **#1** with a score of **420**\nType `!setcolor <color>` to update your leaderboard color.",
					image: {
						url: "attachment://lb.png",
					},
				}),
			],
			files: [
				{
					contentType: "image/png",
					dataBase64: Buffer.from("png-bytes").toString("base64"),
					name: "lb.png",
				},
			],
		});
	});

	it("handles unranked users without crashing", async () => {
		rankingService.isRankingEnabled.mockResolvedValue(true);
		rankingService.getLeaderboardPage.mockResolvedValue([
			{
				color: null,
				displayName: "Other User",
				score: 42,
				userId: "user-2",
			},
		]);
		rankingService.getRankedUser.mockResolvedValue(null);

		const response = await command.executeSlash({
			event: {
				eventId: "event-4",
				payload: {
					channelId: "channel-1",
					commandName: "leaderboard",
					guildId: "guild-1",
					guildIconUrl: "",
					guildName: "Guild One",
					interactionId: "interaction-1",
					interactionToken: "token-1",
					options: {
						page: "2",
					},
					userId: "user-1",
				},
				timestamp: "2026-05-10T00:00:00.000Z",
				type: "discord.interaction.create",
			} as RobotmanEvent<DiscordInteractionPayload>,
		});

		expect(rankingService.getPrefixForGuild).toHaveBeenCalledWith("guild-1");
		expect(response.embeds?.[0]?.description).toContain(
			"You are not ranked yet in this server.",
		);
	});
});
