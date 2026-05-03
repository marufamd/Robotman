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

import { WORKER_RABBITMQ_CLIENT } from "./commands.constants";
import { CommandsRegistryService } from "./commands.registry";

@Controller()
export class InteractionCommandController {
	public constructor(
		private readonly commandsRegistryService: CommandsRegistryService,
		@Inject(WORKER_RABBITMQ_CLIENT)
		private readonly rabbitMqClient: ClientProxy,
	) {}

	@EventPattern(EventType.DISCORD_INTERACTION)
	public async handleInteraction(
		@Payload() event: RobotmanEvent<DiscordInteractionPayload>,
		@Ctx() _context: RmqContext,
	): Promise<void> {
		const commandHandler = this.commandsRegistryService.getSlashCommandHandler(
			event.payload.commandName.toLowerCase(),
		);

		if (!commandHandler?.executeSlash) {
			return;
		}

		const result = await commandHandler.executeSlash({
			event,
		});
		const replyEvent: RobotmanEvent<OutboundInteractionReplyPayload> = {
			eventId: randomUUID(),
			payload: {
				...result,
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
