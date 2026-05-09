import { randomUUID } from "node:crypto";

import {
	EventType,
	type DiscordMessagePayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";
import { Controller, Inject, Logger } from "@nestjs/common";
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
	private readonly logger = new Logger(MessageCommandController.name);

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
		this.logger.log(
			`Received discord.message.create guild=${event.payload.guildId} channel=${event.payload.channelId} user=${event.payload.userId} content=${JSON.stringify(event.payload.content)}`,
		);
		const parsedCommand = await this.commandParserService.parseMessage(
			event.payload.content,
			event.payload.guildId,
			event.payload.isBot,
			this.commandsRegistryService.getPrefixCommandDefinitions(),
			event.payload.userId,
		);

		if (!parsedCommand) {
			this.logger.log(
				`Ignored message for prefix parsing guild=${event.payload.guildId} content=${JSON.stringify(event.payload.content)}`,
			);
			return;
		}
		this.logger.log(
			`Parsed prefix command guild=${event.payload.guildId} command=${parsedCommand.commandName} alias=${parsedCommand.alias} prefix=${parsedCommand.prefix}`,
		);

		const commandHandler = this.commandsRegistryService.getCommandHandler(
			parsedCommand.commandName,
		);

		if (!commandHandler?.executePrefix) {
			this.logger.warn(
				`No prefix handler found for command=${parsedCommand.commandName}`,
			);
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
		this.logger.log(
			`Emitted discord.message.outbound guild=${event.payload.guildId} channel=${event.payload.channelId} command=${parsedCommand.commandName}`,
		);
	}
}
