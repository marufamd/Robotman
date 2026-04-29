import { z } from "zod";

export const GuildSummarySchema = z.object({
	guildId: z.string().min(1, "Guild ID is required"),
	name: z.string().min(1, "Guild name is required"),
	iconUrl: z.string().url().nullable(),
	isOwner: z.boolean(),
});

export const GuildSettingsSchema = z.object({
	guildId: z.string().min(1, "Guild ID is required"),
	prefix: z.string().trim().min(1).max(15).nullable(),
	isRankingEnabled: z.boolean(),
	auditLogChannelId: z.string().trim().min(1).nullable(),
});

export const AutoResponseSchema = z.object({
	id: z.string().uuid(),
	guildId: z.string().min(1, "Guild ID is required"),
	name: z.string().trim().min(1, "Name is required"),
	type: z.string().trim().min(1, "Type is required"),
	content: z.string().trim().min(1, "Content is required"),
	aliases: z.array(z.string().trim().min(1, "Aliases cannot be empty")),
	wildcard: z.boolean(),
	embed: z.boolean(),
	embedColor: z.number().int().min(0).max(0xffffff).nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const UpsertAutoResponseSchema = z.object({
	guildId: z.string().min(1, "Guild ID is required"),
	name: z.string().trim().min(1, "Name is required"),
	type: z.string().trim().min(1, "Type is required"),
	content: z.string().trim().min(1, "Content is required"),
	aliases: z.array(z.string().trim().min(1, "Aliases cannot be empty")),
	wildcard: z.boolean(),
	embed: z.boolean(),
	embedColor: z.number().int().min(0).max(0xffffff).nullable(),
});

export type GuildSummary = z.infer<typeof GuildSummarySchema>;
export type GuildSettings = z.infer<typeof GuildSettingsSchema>;
export type AutoResponse = z.infer<typeof AutoResponseSchema>;
export type UpsertAutoResponse = z.infer<typeof UpsertAutoResponseSchema>;
