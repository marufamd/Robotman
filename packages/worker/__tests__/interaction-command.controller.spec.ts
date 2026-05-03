import { Test, type TestingModule } from "@nestjs/testing";
import type { RmqContext } from "@nestjs/microservices";
import {
	EventType,
	type DiscordInteractionPayload,
	type OutboundInteractionReplyPayload,
	type RobotmanEvent,
} from "@robotman/shared";
import { of } from "rxjs";

import { WORKER_RABBITMQ_CLIENT } from "../src/commands/commands.constants";
import type { CommandHandler } from "../src/commands/command-handler";
import { InteractionCommandController } from "../src/commands/interaction-command.controller";
import { CommandsRegistryService } from "../src/commands/commands.registry";

describe("InteractionCommandController", () => {
	let controller: InteractionCommandController;
	let commandsRegistryService: {
		getSlashCommandHandler: jest.Mock<CommandHandler | null, [string]>;
	};
	let rabbitMqClient: {
		emit: jest.Mock;
	};

	const rmqContext = {} as RmqContext;

	beforeEach(async () => {
		commandsRegistryService = {
			getSlashCommandHandler: jest.fn<CommandHandler | null, [string]>(),
		};
		rabbitMqClient = {
			emit: jest.fn().mockReturnValue(of(void 0)),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [InteractionCommandController],
			providers: [
				{
					provide: CommandsRegistryService,
					useValue: commandsRegistryService,
				},
				{
					provide: WORKER_RABBITMQ_CLIENT,
					useValue: rabbitMqClient,
				},
			],
		}).compile();

		controller = module.get<InteractionCommandController>(
			InteractionCommandController,
		);
	});

	it("dispatches a slash command and emits an interaction reply", async () => {
		const commandHandler: CommandHandler = {
			definition: {
				name: "ping",
				slash: {},
			},
			executeSlash: jest.fn().mockResolvedValue({
				embeds: [{ color: 0xffb700, title: "Pong!" }],
			}),
		};
		commandsRegistryService.getSlashCommandHandler.mockReturnValue(commandHandler);

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

		await controller.handleInteraction(event, rmqContext);

		expect(commandsRegistryService.getSlashCommandHandler).toHaveBeenCalledWith(
			"ping",
		);
		expect(commandHandler.executeSlash).toHaveBeenCalledWith({
			event,
		});
		expect(rabbitMqClient.emit).toHaveBeenCalledWith(
			EventType.DISCORD_OUTBOUND_REPLY,
			expect.objectContaining<
				Partial<RobotmanEvent<OutboundInteractionReplyPayload>>
			>({
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

	it("ignores unknown slash commands", async () => {
		commandsRegistryService.getSlashCommandHandler.mockReturnValue(null);

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

		await controller.handleInteraction(event, rmqContext);

		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});

	it("ignores handlers without slash executors", async () => {
		commandsRegistryService.getSlashCommandHandler.mockReturnValue({
			definition: {
				name: "echo",
				prefix: {},
			},
			executePrefix: jest.fn(),
		});

		const event: RobotmanEvent<DiscordInteractionPayload> = {
			eventId: "event-3",
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

		await controller.handleInteraction(event, rmqContext);

		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});
});
