import { Test, type TestingModule } from "@nestjs/testing";
import type { DiscordMessagePayload, RobotmanEvent } from "@robotman/shared";

import { SetColorCommand } from "../src/commands/utilities/leaderboard/set-color.command";
import { RankingService } from "../src/ranking/ranking.service";

describe("SetColorCommand", () => {
	let command: SetColorCommand;
	let rankingService: {
		setColor: jest.Mock<Promise<void>, [unknown]>;
	};

	beforeEach(async () => {
		rankingService = {
			setColor: jest.fn().mockResolvedValue(undefined),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SetColorCommand,
				{
					provide: RankingService,
					useValue: rankingService,
				},
			],
		}).compile();

		command = module.get<SetColorCommand>(SetColorCommand);
	});

	it("exposes prefix-only color command metadata", () => {
		expect(command.definition).toEqual({
			name: "setcolor",
			prefix: {
				aliases: ["set-colour"],
				args: [
					expect.objectContaining({
						match: "content",
						name: "color",
						required: true,
					}),
				],
			},
		});
	});

	it("upserts user color and returns confirmation embed", async () => {
		const response = await command.executePrefix({
			event: {
				eventId: "event-1",
				payload: {
					channelId: "channel-1",
					content: "!setcolor #ffb700",
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
				alias: "setcolor",
				args: {
					color: 0xffb700,
				},
				commandName: "setcolor",
				orderedArgs: ["#ffb700"],
				prefix: "!",
				remainder: "#ffb700",
			},
		});

		expect(rankingService.setColor).toHaveBeenCalledWith({
			color: 0xffb700,
			displayName: "Robotman",
			guildId: "guild-1",
			userId: "user-1",
		});
		expect(response).toEqual({
			embeds: [
				{
					color: 0xffb700,
					description: "Updated your leaderboard colour to #FFB700",
					title: "Leaderboard Color Updated",
				},
			],
		});
	});
});
