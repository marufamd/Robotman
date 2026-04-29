import { randomUUID } from "node:crypto";

import {
	EventType,
	type DiscordInteractionPayload,
	type OutboundInteractionReplyPayload,
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

import { WORKER_RABBITMQ_CLIENT } from "./ping.constants";
import { PingService } from "./ping.service";

@Controller()
export class PingInteractionController {
	public constructor(
		private readonly pingService: PingService,
		@Inject(WORKER_RABBITMQ_CLIENT)
		private readonly rabbitMqClient: ClientProxy,
	) {}

	@EventPattern(EventType.DISCORD_INTERACTION)
	public handleInteraction(
		@Payload() event: RobotmanEvent<DiscordInteractionPayload>,
		@Ctx() _context: RmqContext,
	): void {
		if (event.payload.commandName !== "ping") {
			return;
		}

		const result = this.pingService.execute();
		const replyEvent: RobotmanEvent<OutboundInteractionReplyPayload> = {
			eventId: randomUUID(),
			payload: {
				embeds: result.embeds,
				interactionId: event.payload.interactionId,
				interactionToken: event.payload.interactionToken,
			},
			timestamp: new Date().toISOString(),
			traceparent: event.traceparent,
			type: EventType.DISCORD_OUTBOUND_REPLY,
		};

		this.rabbitMqClient.emit(EventType.DISCORD_OUTBOUND_REPLY, replyEvent);
	}
}
