import { randomUUID } from "node:crypto";

import {
	EventType,
	type DiscordMessagePayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";
import { Controller, Inject } from "@nestjs/common";
import {
	Ctx,
	EventPattern,
	Payload,
	type ClientProxy,
	type RmqContext,
} from "@nestjs/microservices";

import { CommandParserService } from "../command-parser/command-parser.service";
import { WORKER_RABBITMQ_CLIENT } from "./commands.constants";
import { CommandsRegistryService } from "./commands.registry";

@Controller()
export class MessageCommandController {
	public constructor(
		private readonly commandParserService: CommandParserService,
		private readonly commandsRegistryService: CommandsRegistryService,
		@Inject(WORKER_RABBITMQ_CLIENT)
		private readonly rabbitMqClient: ClientProxy,
	) {}

	@EventPattern(EventType.DISCORD_MESSAGE)
	public async handleMessage(
		@Payload() event: RobotmanEvent<DiscordMessagePayload>,
		@Ctx() _context: RmqContext,
	): Promise<void> {
		const parsedCommand = await this.commandParserService.parseMessage(
			event.payload.content,
			event.payload.guildId,
			event.payload.isBot,
			this.commandsRegistryService.getPrefixCommandDefinitions(),
			event.payload.userId,
		);

		if (!parsedCommand) {
			return;
		}

		const commandHandler = this.commandsRegistryService.getCommandHandler(
			parsedCommand.commandName,
		);

		if (!commandHandler?.executePrefix) {
			return;
		}

		const result = await commandHandler.executePrefix({
			event,
			parsedCommand,
		});
		const outboundEvent: RobotmanEvent<OutboundMessagePayload> = {
			eventId: randomUUID(),
			payload: {
				...result,
				channelId: event.payload.channelId,
			},
			timestamp: new Date().toISOString(),
			traceparent: event.traceparent,
			type: EventType.DISCORD_OUTBOUND_MESSAGE,
		};

		this.rabbitMqClient.emit(EventType.DISCORD_OUTBOUND_MESSAGE, outboundEvent);
	}
}
