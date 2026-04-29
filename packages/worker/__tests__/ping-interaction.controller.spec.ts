import { Test, type TestingModule } from "@nestjs/testing";
import type { ClientProxy, RmqContext } from "@nestjs/microservices";
import {
	EventType,
	type DiscordInteractionPayload,
	type OutboundInteractionReplyPayload,
	type RobotmanEvent,
} from "@robotman/shared";
import { of } from "rxjs";

import { WORKER_RABBITMQ_CLIENT } from "../src/commands/utilities/ping/ping.constants";
import { PingInteractionController } from "../src/commands/utilities/ping/ping-interaction.controller";
import { PingService } from "../src/commands/utilities/ping/ping.service";

describe("PingInteractionController", () => {
	let controller: PingInteractionController;
	let pingService: {
		execute: jest.Mock;
	};
	let rabbitMqClient: {
		emit: jest.Mock;
	};

	const rmqContext = {} as RmqContext;

	beforeEach(async () => {
		pingService = {
			execute: jest.fn().mockReturnValue({
				embeds: [{ color: 0xffb700, title: "Pong!" }],
			}),
		};
		rabbitMqClient = {
			emit: jest.fn().mockReturnValue(of(void 0)),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [PingInteractionController],
			providers: [
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

		controller = module.get<PingInteractionController>(PingInteractionController);
	});

	it("publishes a Discord interaction reply event for the ping slash command", () => {
		const event: RobotmanEvent<DiscordInteractionPayload> = {
			eventId: "event-1",
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
			traceparent: "00-abc-def-01",
			type: EventType.DISCORD_INTERACTION,
		};

		controller.handleInteraction(event, rmqContext);

		expect(pingService.execute).toHaveBeenCalledTimes(1);
		expect(rabbitMqClient.emit).toHaveBeenCalledTimes(1);
		expect(rabbitMqClient.emit).toHaveBeenCalledWith(
			EventType.DISCORD_OUTBOUND_REPLY,
			expect.objectContaining<Partial<RobotmanEvent<OutboundInteractionReplyPayload>>>({
				payload: {
					embeds: [{ color: 0xffb700, title: "Pong!" }],
					interactionId: "interaction-1",
					interactionToken: "token-1",
				},
				traceparent: "00-abc-def-01",
				type: EventType.DISCORD_OUTBOUND_REPLY,
			}),
		);
	});

	it("ignores non-ping slash commands", () => {
		const event: RobotmanEvent<DiscordInteractionPayload> = {
			eventId: "event-2",
			payload: {
				channelId: "channel-1",
				commandName: "echo",
				guildId: "guild-1",
				interactionId: "interaction-1",
				interactionToken: "token-1",
				options: {},
				userId: "user-1",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DISCORD_INTERACTION,
		};

		controller.handleInteraction(event, rmqContext);

		expect(pingService.execute).not.toHaveBeenCalled();
		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});
});
