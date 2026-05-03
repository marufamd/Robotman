import { Test, type TestingModule } from "@nestjs/testing";
import type { ClientProxy, RmqContext } from "@nestjs/microservices";
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
import { WORKER_RABBITMQ_CLIENT } from "../src/commands/commands.constants";
import type { CommandHandler, PrefixCommandDefinition } from "../src/commands/command-handler";
import { MessageCommandController } from "../src/commands/message-command.controller";
import { CommandsRegistryService } from "../src/commands/commands.registry";

describe("MessageCommandController", () => {
	let controller: MessageCommandController;
	let commandParserService: {
		parseMessage: jest.Mock<
			Promise<ParsedCommand | null>,
			[string, string, boolean, readonly PrefixCommandDefinition[], string]
		>;
	};
	let commandsRegistryService: {
		getPrefixCommandDefinitions: jest.Mock<readonly PrefixCommandDefinition[], []>;
		getCommandHandler: jest.Mock<CommandHandler | null, [string]>;
	};
	let rabbitMqClient: {
		emit: jest.Mock;
	};

	const rmqContext = {} as RmqContext;
	const prefixCommandDefinitions: readonly PrefixCommandDefinition[] = [
		{
			aliases: ["pong"],
			name: "ping",
		},
	];

	beforeEach(async () => {
		commandParserService = {
			parseMessage: jest.fn<
				Promise<ParsedCommand | null>,
				[string, string, boolean, readonly PrefixCommandDefinition[], string]
			>(),
		};
		commandsRegistryService = {
			getPrefixCommandDefinitions: jest
				.fn<readonly PrefixCommandDefinition[], []>()
				.mockReturnValue(prefixCommandDefinitions),
			getCommandHandler: jest.fn<CommandHandler | null, [string]>(),
		};
		rabbitMqClient = {
			emit: jest.fn().mockReturnValue(of(void 0)),
		};

		const module: TestingModule = await Test.createTestingModule({
			controllers: [MessageCommandController],
			providers: [
				{
					provide: CommandParserService,
					useValue: commandParserService,
				},
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

		controller = module.get<MessageCommandController>(MessageCommandController);
	});

	it("dispatches a parsed prefix command and emits an outbound message", async () => {
		const commandHandler: CommandHandler = {
			definition: {
				name: "ping",
			},
			executePrefix: jest.fn().mockResolvedValue({
				content: "pong",
			}),
		};

		commandParserService.parseMessage.mockResolvedValue({
			alias: "pong",
			args: {},
			commandName: "ping",
			orderedArgs: [],
			prefix: "!",
			remainder: "",
		});
		commandsRegistryService.getCommandHandler.mockReturnValue(commandHandler);

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-1",
			payload: {
				channelId: "channel-9",
				content: "!pong",
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
			"!pong",
			"guild-9",
			false,
			prefixCommandDefinitions,
			"user-9",
		);
		expect(commandHandler.executePrefix).toHaveBeenCalledWith({
			event,
			parsedCommand: {
				alias: "pong",
				args: {},
				commandName: "ping",
				orderedArgs: [],
				prefix: "!",
				remainder: "",
			},
		});
		expect(rabbitMqClient.emit).toHaveBeenCalledWith(
			EventType.DISCORD_OUTBOUND_MESSAGE,
			expect.objectContaining<Partial<RobotmanEvent<OutboundMessagePayload>>>({
				payload: {
					channelId: "channel-9",
					content: "pong",
				},
				traceparent: "00-abc-def-01",
				type: EventType.DISCORD_OUTBOUND_MESSAGE,
			}),
		);
	});

	it("returns when parser does not match a prefix command", async () => {
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

		expect(commandsRegistryService.getCommandHandler).not.toHaveBeenCalled();
		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});

	it("returns when registry has no handler for parsed command", async () => {
		commandParserService.parseMessage.mockResolvedValue({
			alias: "ghost",
			args: {},
			commandName: "ghost",
			orderedArgs: [],
			prefix: "!",
			remainder: "",
		});
		commandsRegistryService.getCommandHandler.mockReturnValue(null);

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-3",
			payload: {
				channelId: "channel-9",
				content: "!ghost",
				guildId: "guild-9",
				isBot: false,
				messageId: "message-9",
				userId: "user-9",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.handleMessage(event, rmqContext);

		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});

	it("returns when handler has no prefix executor", async () => {
		commandParserService.parseMessage.mockResolvedValue({
			alias: "ghost",
			args: {},
			commandName: "ghost",
			orderedArgs: [],
			prefix: "!",
			remainder: "",
		});
		commandsRegistryService.getCommandHandler.mockReturnValue({
			definition: {
				name: "ghost",
				slash: {},
			},
			executeSlash: jest.fn(),
		});

		const event: RobotmanEvent<DiscordMessagePayload> = {
			eventId: "event-4",
			payload: {
				channelId: "channel-9",
				content: "!ghost",
				guildId: "guild-9",
				isBot: false,
				messageId: "message-9",
				userId: "user-9",
			},
			timestamp: "2026-04-28T00:00:00.000Z",
			type: EventType.DISCORD_MESSAGE,
		};

		await controller.handleMessage(event, rmqContext);

		expect(rabbitMqClient.emit).not.toHaveBeenCalled();
	});
});
