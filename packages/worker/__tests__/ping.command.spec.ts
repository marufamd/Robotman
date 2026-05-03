import { Test, type TestingModule } from "@nestjs/testing";
import type {
	DiscordInteractionPayload,
	DiscordMessagePayload,
	RobotmanEvent,
} from "@robotman/shared";

import { PingCommand } from "../src/commands/utilities/ping/ping.command";
import { PingService } from "../src/commands/utilities/ping/ping.service";

describe("PingCommand", () => {
	let command: PingCommand;
	let pingService: {
		execute: jest.Mock;
	};

	beforeEach(async () => {
		pingService = {
			execute: jest.fn().mockReturnValue({
				embeds: [{ color: 0xffb700, title: "Pong!" }],
			}),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PingCommand,
				{
					provide: PingService,
					useValue: pingService,
				},
			],
		}).compile();

		command = module.get<PingCommand>(PingCommand);
	});

	it("exposes unified ping command metadata", () => {
		expect(command.definition).toEqual({
			name: "ping",
			prefix: {
				aliases: ["pong"],
			},
			slash: {},
		});
	});

	it("returns ping service embeds for prefix execution", () => {
		const event = {
			eventId: "event-1",
			payload: {
				channelId: "channel-1",
				content: "!ping",
				guildId: "guild-1",
				isBot: false,
				messageId: "message-1",
				userId: "user-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: "discord.message.create",
		} as RobotmanEvent<DiscordMessagePayload>;

		expect(
			command.executePrefix({
				event,
				parsedCommand: {
					alias: "ping",
					args: {},
					commandName: "ping",
					orderedArgs: [],
					prefix: "!",
					remainder: "",
				},
			}),
		).toEqual({
			embeds: [{ color: 0xffb700, title: "Pong!" }],
		});
	});

	it("returns ping service embeds for slash execution", () => {
		const event = {
			eventId: "event-2",
			payload: {
				channelId: "channel-1",
				commandName: "ping",
				guildId: "guild-1",
				interactionId: "interaction-1",
				interactionToken: "token-1",
				options: {},
				userId: "user-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: "discord.interaction.create",
		} as RobotmanEvent<DiscordInteractionPayload>;

		expect(command.executeSlash({ event })).toEqual({
			embeds: [{ color: 0xffb700, title: "Pong!" }],
		});
		expect(pingService.execute).toHaveBeenCalledTimes(1);
	});
});
