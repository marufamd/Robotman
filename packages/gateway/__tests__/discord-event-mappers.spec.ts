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
				global_name: "Robotman Global",
				id: "user-1",
				username: "robotman",
			},
			channel_id: "channel-1",
			content: "!ping",
			guild_id: "guild-1",
			id: "message-1",
			member: {
				nick: "Robotman Nick",
			},
			timestamp: "2026-05-09T12:00:00.000Z",
		} as GatewayMessageCreateDispatchData;

		const event = createDiscordMessageEvent(message, {
			guildIconUrl: "https://cdn.discordapp.com/icons/guild-1/icon.png?size=256",
			guildName: "Guild One",
		});

		expect(event.type).toBe(EventType.DISCORD_MESSAGE);
		expect(event.payload).toEqual({
			channelId: "channel-1",
			content: "!ping",
			guildId: "guild-1",
			guildIconUrl: "https://cdn.discordapp.com/icons/guild-1/icon.png?size=256",
			guildName: "Guild One",
			isBot: false,
			isSystem: false,
			memberDisplayName: "Robotman Nick",
			messageId: "message-1",
			timestamp: "2026-05-09T12:00:00.000Z",
			userId: "user-1",
			webhookId: null,
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

		const event = createDiscordInteractionEvent(interaction, {
			guildIconUrl: "https://cdn.discordapp.com/icons/guild-1/icon.png?size=256",
			guildName: "Guild One",
		});

		expect(event.type).toBe(EventType.DISCORD_INTERACTION);
		expect(event.payload).toEqual({
			channelId: "channel-1",
			commandName: "ping",
			guildId: "guild-1",
			guildIconUrl: "https://cdn.discordapp.com/icons/guild-1/icon.png?size=256",
			guildName: "Guild One",
			interactionId: "interaction-1",
			interactionToken: "token-1",
			options: {},
			userId: "user-1",
		});
	});
});
