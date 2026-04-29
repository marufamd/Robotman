import { Test, type TestingModule } from "@nestjs/testing";
import type { RmqContext } from "@nestjs/microservices";
import {
	EventType,
	type DiscordMessagePayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";
import { of } from "rxjs";

import { AUTO_RESPONSE_RABBITMQ_CLIENT } from "../src/scanner/scanner.constants";
import { ScannerController } from "../src/scanner/scanner.controller";
import { ScannerService } from "../src/scanner/scanner.service";

describe("ScannerController", () => {
	let controller: ScannerController;
	let scannerService: {
		findReply: jest.Mock<Promise<string | null>, [string, string, boolean]>;
	};
	let rabbitMqClient: {
		emit: jest.Mock;
	};

	const rmqContext = {} as RmqContext;

	beforeEach(async () => {
		scannerService = {
			findReply: jest.fn<Promise<string | null>, [string, string, boolean]>(),
		};
		rabbitMqClient = {
			emit: jest.fn().mockReturnValue(of(void 0)),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [ScannerController],
			providers: [
				{
					provide: ScannerService,
					useValue: scannerService,
				},
				{
					provide: AUTO_RESPONSE_RABBITMQ_CLIENT,
					useValue: rabbitMqClient,
				},
			],
		}).compile();

		controller = module.get<ScannerController>(ScannerController);
	});

	it("publishes an outbound message when a cached trigger matches", async () => {
		scannerService.findReply.mockResolvedValue("pong");

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-1",
			payload: {
				channelId: "channel-1",
				content: "ping",
				guildId: "guild-1",
				isBot: false,
				messageId: "message-1",
				userId: "user-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			traceparent: "00-abc-def-01",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.scanMessage(event, rmqContext);

		expect(scannerService.findReply).toHaveBeenCalledWith(
			"ping",
			"guild-1",
			false,
		);
		expect(rabbitMqClient.emit).toHaveBeenCalledWith(
			EventType.DISCORD_OUTBOUND_MESSAGE,
			expect.objectContaining<Partial<RobotmanEvent<OutboundMessagePayload>>>({
				payload: {
					channelId: "channel-1",
					content: "pong",
				},
				traceparent: "00-abc-def-01",
				type: EventType.DISCORD_OUTBOUND_MESSAGE,
			}),
		);
	});

	it("does not publish when no trigger matches", async () => {
		scannerService.findReply.mockResolvedValue(null);

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-2",
			payload: {
				channelId: "channel-1",
				content: "ping",
				guildId: "guild-1",
				isBot: false,
				messageId: "message-1",
				userId: "user-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.scanMessage(event, rmqContext);

		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});
});
