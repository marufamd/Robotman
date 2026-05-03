import { z } from "zod";

export enum AutoResponseType {
	Moderator = "Moderator",
	Character = "Character",
	Writer = "Writer",
	Regular = "Regular",
	Booster = "Booster",
}

export enum AuditLogAction {
	Create = "CREATE",
	Update = "UPDATE",
	Delete = "DELETE",
	Toggle = "TOGGLE",
}

export enum AuditLogResourceType {
	AutoResponse = "AUTO_RESPONSE",
	GuildSettings = "GUILD_SETTINGS",
}

export const AUTO_RESPONSE_TYPE_OPTIONS = Object.values(AutoResponseType);
export const AUDIT_LOG_ACTION_OPTIONS = Object.values(AuditLogAction);
export const AUDIT_LOG_RESOURCE_TYPE_OPTIONS = Object.values(AuditLogResourceType);

export const AutoResponseTypeSchema = z.nativeEnum(AutoResponseType);
export const AuditLogActionSchema = z.nativeEnum(AuditLogAction);
export const AuditLogResourceTypeSchema = z.nativeEnum(AuditLogResourceType);

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
	trigger: z.string().trim().min(1, "Trigger is required"),
	type: AutoResponseTypeSchema,
	content: z.string().trim().min(1, "Content is required"),
	aliases: z.array(z.string().trim().min(1, "Aliases cannot be empty")),
	wildcard: z.boolean(),
	embed: z.boolean(),
	embedColor: z.number().int().min(0).max(0xffffff).nullable(),
	createdBy: z.string().trim().min(1, "Created by is required"),
	lastEditedBy: z.string().trim().min(1).nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const UpsertAutoResponseSchema = z.object({
	guildId: z.string().min(1, "Guild ID is required"),
	trigger: z.string().trim().min(1, "Trigger is required"),
	type: AutoResponseTypeSchema,
	content: z.string().trim().min(1, "Content is required"),
	aliases: z.array(z.string().trim().min(1, "Aliases cannot be empty")),
	wildcard: z.boolean(),
	embed: z.boolean(),
	embedColor: z.number().int().min(0).max(0xffffff).nullable(),
});

const AuditLogChangesSchema = z
	.object({
		before: z.record(z.string(), z.unknown()).optional(),
		after: z.record(z.string(), z.unknown()).optional(),
	})
	.passthrough()
	.nullable();

export const AuditLogEntrySchema = z.object({
	id: z.string().uuid(),
	guildId: z.string().min(1, "Guild ID is required"),
	userId: z.string().min(1, "User ID is required"),
	userUsername: z.string().min(1, "Username is required"),
	action: AuditLogActionSchema,
	resourceType: AuditLogResourceTypeSchema,
	resourceId: z.string().trim().min(1).nullable(),
	resourceName: z.string().trim().min(1).nullable(),
	changes: AuditLogChangesSchema,
	createdAt: z.string().datetime(),
});

export const AuditLogPageSchema = z.object({
	entries: z.array(AuditLogEntrySchema),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
	total: z.number().int().min(0),
	totalPages: z.number().int().min(1),
});

export type GuildSummary = z.infer<typeof GuildSummarySchema>;
export type GuildSettings = z.infer<typeof GuildSettingsSchema>;
export type AutoResponse = z.infer<typeof AutoResponseSchema>;
export type UpsertAutoResponse = z.infer<typeof UpsertAutoResponseSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type AuditLogPage = z.infer<typeof AuditLogPageSchema>;
