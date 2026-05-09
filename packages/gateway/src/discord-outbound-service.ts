import { REST } from "@discordjs/rest";
import {
	InteractionResponseType,
	MessageFlags,
	Routes,
	type APIEmbed,
	type RESTPostAPIChannelMessageJSONBody,
} from "discord-api-types/v10";

import {
	EventType,
	type OutboundInteractionReplyPayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";

export interface DiscordRestWriter {
	post(route: string, options: { body: unknown }): Promise<unknown>;
}

export interface DiscordOutboundServiceOptions {
	logger?: Pick<typeof console, "error" | "info">;
	rest: DiscordRestWriter;
}

type OutboundGatewayEvent =
	| RobotmanEvent<OutboundMessagePayload>
	| RobotmanEvent<OutboundInteractionReplyPayload>;

const toEmbeds = (embeds?: Array<Record<string, unknown>>): APIEmbed[] | undefined =>
	embeds as APIEmbed[] | undefined;

export class DiscordOutboundService {
	private readonly logger: Pick<typeof console, "error" | "info">;

	public constructor(private readonly options: DiscordOutboundServiceOptions) {
		this.logger = options.logger ?? console;
	}

	public async handleEvent(event: OutboundGatewayEvent): Promise<void> {
		switch (event.type) {
			case EventType.DISCORD_OUTBOUND_MESSAGE:
				await this.sendMessage(event as RobotmanEvent<OutboundMessagePayload>);
				return;
			case EventType.DISCORD_OUTBOUND_REPLY:
				await this.sendInteractionReply(
					event as RobotmanEvent<OutboundInteractionReplyPayload>,
				);
				return;
			default:
				this.logger.error("Gateway: received unsupported outbound event", event.type);
		}
	}

	private async sendMessage(
		event: RobotmanEvent<OutboundMessagePayload>,
	): Promise<void> {
		const body: RESTPostAPIChannelMessageJSONBody = {
			content: event.payload.content,
			embeds: toEmbeds(event.payload.embeds),
			message_reference: event.payload.replyToMessageId
				? {
						message_id: event.payload.replyToMessageId,
					}
				: undefined,
		};

		await this.options.rest.post(Routes.channelMessages(event.payload.channelId), {
			body,
		});
		this.logger.info(`Gateway: sent outbound message to channel ${event.payload.channelId}`);
	}

	private async sendInteractionReply(
		event: RobotmanEvent<OutboundInteractionReplyPayload>,
	): Promise<void> {
		const body = {
			data: {
				content: event.payload.content,
				embeds: toEmbeds(event.payload.embeds),
				flags: event.payload.isEphemeral ? MessageFlags.Ephemeral : undefined,
			},
			type: InteractionResponseType.ChannelMessageWithSource,
		};

		await this.options.rest.post(
			Routes.interactionCallback(
				event.payload.interactionId,
				event.payload.interactionToken,
			),
			{ body },
		);
		this.logger.info(
			`Gateway: sent interaction reply for ${event.payload.interactionId}`,
		);
	}
}

export { REST };
