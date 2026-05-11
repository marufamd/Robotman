import { Buffer } from "node:buffer";

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
				files: [
					{
						contentType: "image/png",
						dataBase64: Buffer.from("png-bytes").toString("base64"),
						description: "Leaderboard image",
						name: "lb.png",
					},
				],
				replyToMessageId: "message-1",
			},
			timestamp: "2026-05-03T00:00:00.000Z",
			type: EventType.DISCORD_OUTBOUND_MESSAGE,
		};

		await service.handleEvent(event);

		expect(rest.post).toHaveBeenCalledWith(Routes.channelMessages("channel-1"), {
			body: {
				attachments: [
					{
						description: "Leaderboard image",
						filename: "lb.png",
						id: "0",
					},
				],
				content: "pong",
				embeds: [{ title: "Pong!" }],
				message_reference: {
					message_id: "message-1",
				},
			},
			files: [
				{
					contentType: "image/png",
					data: Buffer.from("png-bytes"),
					key: "files[0]",
					name: "lb.png",
				},
			],
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
				files: [
					{
						contentType: "image/png",
						dataBase64: Buffer.from("png-bytes").toString("base64"),
						name: "lb.png",
					},
				],
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
				auth: false,
				body: {
					data: {
						attachments: [
							{
								description: undefined,
								filename: "lb.png",
								id: "0",
							},
						],
						content: "pong",
						embeds: undefined,
						flags: MessageFlags.Ephemeral,
					},
					type: InteractionResponseType.ChannelMessageWithSource,
				},
				files: [
					{
						contentType: "image/png",
						data: Buffer.from("png-bytes"),
						key: "files[0]",
						name: "lb.png",
					},
				],
			},
		);
	});
});
