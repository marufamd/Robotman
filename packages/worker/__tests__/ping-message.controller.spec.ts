import { Test, type TestingModule } from "@nestjs/testing";
import type { RmqContext } from "@nestjs/microservices";
import {
	EventType,
	type DiscordMessagePayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";
import { of } from "rxjs";

import {
	CommandParserService,
	type ParsedCommand,
} from "../src/command-parser/command-parser.service";
import { WORKER_RABBITMQ_CLIENT } from "../src/commands/utilities/ping/ping.constants";
import { PingMessageController } from "../src/commands/utilities/ping/ping-message.controller";
import { PingService } from "../src/commands/utilities/ping/ping.service";

describe("PingMessageController", () => {
	let controller: PingMessageController;
	let commandParserService: {
		parseMessage: jest.Mock<Promise<ParsedCommand | null>, [string, string, boolean]>;
	};
	let pingService: {
		execute: jest.Mock;
	};
	let rabbitMqClient: {
		emit: jest.Mock;
	};

	const rmqContext = {} as RmqContext;

	beforeEach(async () => {
		commandParserService = {
			parseMessage: jest.fn<Promise<ParsedCommand | null>, [string, string, boolean]>(),
		};
		pingService = {
			execute: jest.fn().mockReturnValue({
				embeds: [{ color: 0xffb700, title: "Pong!" }],
			}),
		};
		rabbitMqClient = {
			emit: jest.fn().mockReturnValue(of(void 0)),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PingMessageController],
			providers: [
				{
					provide: CommandParserService,
					useValue: commandParserService,
				},
				{
					provide: PingService,
					useValue: pingService,
				},
				{
					provide: WORKER_RABBITMQ_CLIENT,
					useValue: rabbitMqClient,
				},
			],
		}).compile();

		controller = module.get<PingMessageController>(PingMessageController);
	});

	it("publishes an outbound message event when a ping prefix command is parsed", async () => {
		commandParserService.parseMessage.mockResolvedValue({
			args: [],
			commandName: "ping",
		});

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-1",
			payload: {
				channelId: "channel-9",
				content: "!ping",
				guildId: "guild-9",
				isBot: false,
				messageId: "message-9",
				userId: "user-9",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			traceparent: "00-abc-def-01",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.handleMessage(event, rmqContext);

		expect(commandParserService.parseMessage).toHaveBeenCalledWith(
			"!ping",
			"guild-9",
			false,
		);
		expect(pingService.execute).toHaveBeenCalledTimes(1);
		expect(rabbitMqClient.emit).toHaveBeenCalledWith(
			EventType.DISCORD_OUTBOUND_MESSAGE,
			expect.objectContaining<Partial<RobotmanEvent<OutboundMessagePayload>>>({
				payload: {
					channelId: "channel-9",
					embeds: [{ color: 0xffb700, title: "Pong!" }],
				},
				traceparent: "00-abc-def-01",
				type: EventType.DISCORD_OUTBOUND_MESSAGE,
			}),
		);
	});

	it("does not publish when the parser returns null", async () => {
		commandParserService.parseMessage.mockResolvedValue(null);

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-2",
			payload: {
				channelId: "channel-9",
				content: "hello",
				guildId: "guild-9",
				isBot: false,
				messageId: "message-9",
				userId: "user-9",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.handleMessage(event, rmqContext);

		expect(pingService.execute).not.toHaveBeenCalled();
		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});

	it("does not publish when the parsed command is not ping", async () => {
		commandParserService.parseMessage.mockResolvedValue({
			args: [],
			commandName: "echo",
		});

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-3",
			payload: {
				channelId: "channel-9",
				content: "!echo",
				guildId: "guild-9",
				isBot: false,
				messageId: "message-9",
				userId: "user-9",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.handleMessage(event, rmqContext);

		expect(pingService.execute).not.toHaveBeenCalled();
		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});
});
