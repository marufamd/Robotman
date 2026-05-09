import {
	EventType,
	type OutboundInteractionReplyPayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";
import {
	InteractionResponseType,
	MessageFlags,
	Routes,
} from "discord-api-types/v10";

import { DiscordOutboundService } from "../src/discord-outbound-service";

describe("DiscordOutboundService", () => {
	it("sends outbound messages to channel message route", async () => {
		const rest = {
			post: jest.fn(async () => undefined),
		};
		const service = new DiscordOutboundService({
			logger: { error: jest.fn(), info: jest.fn() },
			rest,
		});
		const event: RobotmanEvent<OutboundMessagePayload> = {
			eventId: "event-1",
			payload: {
				channelId: "channel-1",
				content: "pong",
				embeds: [{ title: "Pong!" }],
				replyToMessageId: "message-1",
			},
			timestamp: "2026-05-03T00:00:00.000Z",
			type: EventType.DISCORD_OUTBOUND_MESSAGE,
		};

		await service.handleEvent(event);

		expect(rest.post).toHaveBeenCalledWith(Routes.channelMessages("channel-1"), {
			body: {
				content: "pong",
				embeds: [{ title: "Pong!" }],
				message_reference: {
					message_id: "message-1",
				},
			},
		});
	});

	it("sends interaction replies to the callback route", async () => {
		const rest = {
			post: jest.fn(async () => undefined),
		};
		const service = new DiscordOutboundService({
			logger: { error: jest.fn(), info: jest.fn() },
			rest,
		});
		const event: RobotmanEvent<OutboundInteractionReplyPayload> = {
			eventId: "event-2",
			payload: {
				content: "pong",
				interactionId: "interaction-1",
				interactionToken: "token-1",
				isEphemeral: true,
			},
			timestamp: "2026-05-03T00:00:00.000Z",
			type: EventType.DISCORD_OUTBOUND_REPLY,
		};

		await service.handleEvent(event);

		expect(rest.post).toHaveBeenCalledWith(
			Routes.interactionCallback("interaction-1", "token-1"),
			{
				body: {
					data: {
						content: "pong",
						embeds: undefined,
						flags: MessageFlags.Ephemeral,
					},
					type: InteractionResponseType.ChannelMessageWithSource,
				},
			},
		);
	});
});
