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

import { CommandParserService } from "../../../command-parser/command-parser.service";
import { WORKER_RABBITMQ_CLIENT } from "./ping.constants";
import { PingService } from "./ping.service";

@Controller()
export class PingMessageController {
	public constructor(
		private readonly commandParserService: CommandParserService,
		private readonly pingService: PingService,
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
		);

		if (!parsedCommand || parsedCommand.commandName !== "ping") {
			return;
		}

		const result = this.pingService.execute();
		const outboundEvent: RobotmanEvent<OutboundMessagePayload> = {
			eventId: randomUUID(),
			payload: {
				channelId: event.payload.channelId,
				embeds: result.embeds,
			},
			timestamp: new Date().toISOString(),
			traceparent: event.traceparent,
			type: EventType.DISCORD_OUTBOUND_MESSAGE,
		};

		this.rabbitMqClient.emit(EventType.DISCORD_OUTBOUND_MESSAGE, outboundEvent);
	}
}
