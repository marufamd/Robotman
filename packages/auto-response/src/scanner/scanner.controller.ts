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

import { AUTO_RESPONSE_RABBITMQ_CLIENT } from "./scanner.constants";
import { ScannerService } from "./scanner.service";

@Controller()
export class ScannerController {
	public constructor(
		private readonly scannerService: ScannerService,
		@Inject(AUTO_RESPONSE_RABBITMQ_CLIENT)
		private readonly rabbitMqClient: ClientProxy,
	) {}

	@EventPattern(EventType.DISCORD_MESSAGE)
	public async scanMessage(
		@Payload() event: RobotmanEvent<DiscordMessagePayload>,
		@Ctx() _context: RmqContext,
	): Promise<void> {
		const reply = await this.scannerService.findReply(
			event.payload.content,
			event.payload.guildId,
			event.payload.isBot,
		);

		if (reply === null) {
			return;
		}

		const outboundEvent: RobotmanEvent<OutboundMessagePayload> = {
			eventId: randomUUID(),
			payload: {
				channelId: event.payload.channelId,
				content: reply,
			},
			timestamp: new Date().toISOString(),
			traceparent: event.traceparent,
			type: EventType.DISCORD_OUTBOUND_MESSAGE,
		};

		this.rabbitMqClient.emit(EventType.DISCORD_OUTBOUND_MESSAGE, outboundEvent);
	}
}
