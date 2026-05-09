import { EventType } from "@robotman/shared";
import type {
	GatewayInteractionCreateDispatchData,
	GatewayMessageCreateDispatchData,
} from "discord-api-types/v10";

import {
	createDiscordInteractionEvent,
	createDiscordMessageEvent,
} from "../src/discord-event-mappers";

describe("discord event mappers", () => {
	it("maps message create payload timestamp into shared event payload", () => {
		const message = {
			author: {
				bot: false,
				id: "user-1",
			},
			channel_id: "channel-1",
			content: "!ping",
			guild_id: "guild-1",
			id: "message-1",
			timestamp: "2026-05-09T12:00:00.000Z",
		} as GatewayMessageCreateDispatchData;

		const event = createDiscordMessageEvent(message);

		expect(event.type).toBe(EventType.DISCORD_MESSAGE);
		expect(event.payload).toEqual({
			channelId: "channel-1",
			content: "!ping",
			guildId: "guild-1",
			isBot: false,
			messageId: "message-1",
			timestamp: "2026-05-09T12:00:00.000Z",
			userId: "user-1",
		});
	});

	it("maps slash interaction payload into shared event payload", () => {
		const interaction = {
			channel_id: "channel-1",
			data: {
				name: "ping",
				options: [],
			},
			guild_id: "guild-1",
			id: "interaction-1",
			member: {
				user: {
					id: "user-1",
				},
			},
			token: "token-1",
		} as unknown as GatewayInteractionCreateDispatchData;

		const event = createDiscordInteractionEvent(interaction);

		expect(event.type).toBe(EventType.DISCORD_INTERACTION);
		expect(event.payload).toEqual({
			channelId: "channel-1",
			commandName: "ping",
			guildId: "guild-1",
			interactionId: "interaction-1",
			interactionToken: "token-1",
			options: {},
			userId: "user-1",
		});
	});
});
