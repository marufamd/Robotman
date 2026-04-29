import { randomUUID } from "node:crypto";

import type {
	GatewayInteractionCreateDispatchData,
	GatewayMessageCreateDispatchData,
} from "discord-api-types/v10";

import {
	EventType,
	type DiscordInteractionPayload,
	type DiscordMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function readOptions(value: unknown): Record<string, unknown> {
	if (!Array.isArray(value)) {
		return {};
	}

	return value.reduce<Record<string, unknown>>((accumulator, option) => {
		if (!isRecord(option)) {
			return accumulator;
		}

		const name = readString(option.name);

		if (!name) {
			return accumulator;
		}

		if ("value" in option) {
			accumulator[name] = option.value;
			return accumulator;
		}

		if ("options" in option) {
			accumulator[name] = readOptions(option.options);
			return accumulator;
		}

		accumulator[name] = true;
		return accumulator;
	}, {});
}

export function createDiscordMessageEvent(
	message: GatewayMessageCreateDispatchData,
): RobotmanEvent<DiscordMessagePayload> {
	return {
		eventId: randomUUID(),
		timestamp: new Date().toISOString(),
		type: EventType.DISCORD_MESSAGE,
		payload: {
			messageId: message.id,
			guildId: message.guild_id ?? "",
			channelId: message.channel_id,
			userId: message.author.id,
			content: message.content,
			isBot: Boolean(message.author.bot),
		},
	};
}

export function createDiscordInteractionEvent(
	interaction: GatewayInteractionCreateDispatchData,
): RobotmanEvent<DiscordInteractionPayload> {
	const memberUser =
		isRecord(interaction.member) && isRecord(interaction.member.user)
			? interaction.member.user
			: undefined;
	const interactionData: JsonObject = isRecord(interaction.data)
		? interaction.data
		: {};

	return {
		eventId: randomUUID(),
		timestamp: new Date().toISOString(),
		type: EventType.DISCORD_INTERACTION,
			payload: {
				interactionId: interaction.id,
				interactionToken: interaction.token,
				guildId: interaction.guild_id ?? "",
				channelId: interaction.channel_id ?? "",
				userId: readString(memberUser?.id) || readString(interaction.user?.id),
				commandName: readString(interactionData.name),
				options: readOptions(interactionData.options),
			},
		};
}
