export interface RobotmanEvent<T> {
    eventId: string;
    timestamp: string;
    traceparent?: string;
    type: EventType;
    payload: T;
}
export declare enum EventType {
    DISCORD_INTERACTION = "discord.interaction.create",
    DISCORD_MESSAGE = "discord.message.create",
    DISCORD_OUTBOUND_MESSAGE = "discord.message.outbound",
    DISCORD_OUTBOUND_REPLY = "discord.interaction.reply",
    DASHBOARD_RESPONSE_UPDATED = "dashboard.response.updated",
    DASHBOARD_SETTINGS_UPDATED = "dashboard.settings.updated"
}
export interface DiscordInteractionPayload {
    interactionId: string;
    interactionToken: string;
    guildId: string;
    channelId: string;
    userId: string;
    commandName: string;
    options: Record<string, unknown>;
}
export interface DiscordMessagePayload {
    messageId: string;
    guildId: string;
    channelId: string;
    userId: string;
    content: string;
    isBot: boolean;
}
export interface OutboundMessagePayload {
    channelId: string;
    content?: string;
    embeds?: Array<Record<string, unknown>>;
    replyToMessageId?: string;
}
export interface OutboundInteractionReplyPayload {
    interactionId: string;
    interactionToken: string;
    content?: string;
    embeds?: Array<Record<string, unknown>>;
    isEphemeral?: boolean;
}
export interface DashboardResponseUpdatedPayload {
    guildId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    responseId: string;
    data?: {
        name: string;
        type: string;
        content: string;
        aliases: string[];
        wildcard: boolean;
        embed: boolean;
        embedColor: number | null;
    };
}
export interface DashboardSettingsUpdatedPayload {
    guildId: string;
    isRankingEnabled: boolean;
    auditLogChannelId: string | null;
}
