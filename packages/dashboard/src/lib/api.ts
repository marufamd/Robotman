import {
	AutoResponseSchema,
	GuildSettingsSchema,
	GuildSummarySchema,
	type GuildSettings,
	type UpsertAutoResponse,
	UpsertAutoResponseSchema,
} from "@robotman/shared";
import { getApiBaseUrl } from "./env";
import { parseSession, type Session } from "./types";

type Parser<T> = {
	parse: (input: unknown) => T;
};

const GuildSummaryListSchema = GuildSummarySchema.array();
const AutoResponseListSchema = AutoResponseSchema.array();

async function readError(response: Response) {
	try {
		const data = (await response.json()) as { message?: string };
		return data.message ?? response.statusText;
	} catch {
		return response.statusText;
	}
}

async function fetchJson<T>(
	input: string,
	init: RequestInit,
	schema: Parser<T>,
): Promise<T> {
	const response = await fetch(`${getApiBaseUrl()}${input}`, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init.headers ?? {}),
		},
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return schema.parse(await response.json());
}

export async function getCurrentSession(): Promise<Session | null> {
	const response = await fetch(`${getApiBaseUrl()}/session`, {
		credentials: "include",
	});

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return parseSession(await response.json());
}

export function listGuilds() {
	return fetchJson("/guilds", { method: "GET" }, GuildSummaryListSchema);
}

export function getGuildSettings(guildId: string) {
	return fetchJson(`/guilds/${guildId}/settings`, { method: "GET" }, GuildSettingsSchema);
}

export function updateGuildSettings(guildId: string, payload: GuildSettings) {
	return fetchJson(
		`/guilds/${guildId}/settings`,
		{
			method: "PATCH",
			body: JSON.stringify(GuildSettingsSchema.parse(payload)),
		},
		GuildSettingsSchema,
	);
}

export function listAutoResponses(guildId: string) {
	return fetchJson(
		`/guilds/${guildId}/auto-responses`,
		{ method: "GET" },
		AutoResponseListSchema,
	);
}

export function createAutoResponse(guildId: string, payload: UpsertAutoResponse) {
	return fetchJson(
		`/guilds/${guildId}/auto-responses`,
		{
			method: "POST",
			body: JSON.stringify(UpsertAutoResponseSchema.parse(payload)),
		},
		AutoResponseSchema,
	);
}

export function updateAutoResponse(
	guildId: string,
	responseId: string,
	payload: UpsertAutoResponse,
) {
	return fetchJson(
		`/guilds/${guildId}/auto-responses/${responseId}`,
		{
			method: "PATCH",
			body: JSON.stringify(UpsertAutoResponseSchema.parse(payload)),
		},
		AutoResponseSchema,
	);
}

export async function deleteAutoResponse(guildId: string, responseId: string) {
	const response = await fetch(`${getApiBaseUrl()}/guilds/${guildId}/auto-responses/${responseId}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error(await readError(response));
	}
}
