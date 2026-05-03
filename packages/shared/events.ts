import type { AutoResponseType } from "./dashboard";

// ==========================================
// 1. Core Event Envelope
// Every message sent to RabbitMQ must follow this structure.
// ==========================================
export interface RobotmanEvent<T> {
	eventId: string; // UUID for tracking/tracing
	timestamp: string; // ISO 8601 String
	traceparent?: string; // For Sentry Distributed Tracing
	type: EventType;
	payload: T;
}

export enum EventType {
	// From Gateway
	DISCORD_INTERACTION = "discord.interaction.create",
	DISCORD_MESSAGE = "discord.message.create",

	// From Workers/Engine (Outbound back to Discord)
	DISCORD_OUTBOUND_MESSAGE = "discord.message.outbound",
	DISCORD_OUTBOUND_REPLY = "discord.interaction.reply",

	// From Ruby API (Cache Invalidation)
	DASHBOARD_RESPONSE_UPDATED = "dashboard.response.updated",
	DASHBOARD_SETTINGS_UPDATED = "dashboard.settings.updated",
}

// ==========================================
// 2. Gateway Payloads (Discord -> RabbitMQ)
// ==========================================

export interface DiscordInteractionPayload {
	interactionId: string;
	interactionToken: string;
	guildId: string;
	channelId: string;
	userId: string;
	commandName: string;
	options: Record<string, unknown>; // Parsed slash command arguments
}

export interface DiscordMessagePayload {
	messageId: string;
	guildId: string;
	channelId: string;
	userId: string;
	content: string;
	isBot: boolean;
}

// ==========================================
// 3. Outbound Payloads (RabbitMQ -> Gateway)
// ==========================================

export interface OutboundMessagePayload {
	channelId: string;
	content?: string;
	embeds?: Array<Record<string, unknown>>; // Raw Discord Embed objects
	replyToMessageId?: string;
}

export interface OutboundInteractionReplyPayload {
	interactionId: string;
	interactionToken: string;
	content?: string;
	embeds?: Array<Record<string, unknown>>;
	isEphemeral?: boolean;
}

// ==========================================
// 4. API Invalidation Payloads (Ruby API -> System)
// ==========================================

export interface DashboardResponseUpdatedPayload {
	guildId: string;
	action: "CREATE" | "UPDATE" | "DELETE";
	responseId: string;
	// If created/updated, send the new state so the cache can hydrate without a DB hit
	data?: {
		name: string;
		type: AutoResponseType;
		content: string;
		aliases: string[];
		wildcard: boolean;
		embed: boolean;
		embedColor: number | null;
	};
}

export interface DashboardSettingsUpdatedPayload {
	guildId: string;
	prefix: string | null;
	isRankingEnabled: boolean;
	auditLogChannelId: string | null;
}
