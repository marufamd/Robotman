import {
	AuditLogPageSchema,
	AutoResponseSchema,
	GuildSettingsSchema,
	GuildSummarySchema,
	type AuditLogAction,
	type AuditLogPage,
	type AuditLogResourceType,
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
let csrfTokenPromise: Promise<string> | null = null;

export interface AuditLogQueryParams {
	page: number;
	pageSize: number;
	q?: string;
	action?: AuditLogAction;
	resourceType?: AuditLogResourceType;
}

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
	const headers = await buildHeaders(init);

	const response = await fetch(`${getApiBaseUrl()}${input}`, {
		...init,
		headers,
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return schema.parse(await response.json());
}

async function buildHeaders(init: RequestInit) {
	const headers = new Headers(init.headers);
	headers.set("Content-Type", "application/json");

	if (typeof window === "undefined") {
		try {
			const { getRequestHeader } = await import("@tanstack/react-start/server");
			const cookie = getRequestHeader("cookie");
			if (cookie) {
				headers.set("cookie", cookie);
			}
		} catch {
			// ignore
		}
	}

	const method = (init.method ?? "GET").toUpperCase();
	if (!["GET", "HEAD"].includes(method)) {
		headers.set("X-CSRF-Token", await getCsrfToken(headers));
	}

	return headers;
}

async function getCsrfToken(existingHeaders?: Headers) {
	if (!csrfTokenPromise) {
		const headers = existingHeaders ? new Headers(existingHeaders) : undefined;

		csrfTokenPromise = fetch(`${getApiBaseUrl()}/csrf`, {
			headers,
			credentials: "include",
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(await readError(response));
				}

				const payload = (await response.json()) as { csrfToken?: string };
				if (!payload.csrfToken) {
					throw new Error("Missing CSRF token");
				}

				return payload.csrfToken;
			})
			.catch((error) => {
				csrfTokenPromise = null;
				throw error;
			});
	}

	return csrfTokenPromise;
}

export async function getCurrentSession(): Promise<Session | null> {
	let response: Response;

	try {
		const headers = new Headers();
		if (typeof window === "undefined") {
			try {
				const { getRequestHeader } = await import("@tanstack/react-start/server");
				const cookie = getRequestHeader("cookie");
				if (cookie) {
					headers.set("cookie", cookie);
				}
			} catch (e) {
				// ignore
			}
		}

		response = await fetch(`${getApiBaseUrl()}/session`, {
			headers,
			credentials: "include",
		});
	} catch {
		return null;
	}

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

export function listAuditLog(guildId: string, params: AuditLogQueryParams): Promise<AuditLogPage> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", params.page.toString());
	searchParams.set("pageSize", params.pageSize.toString());

	if (params.q) {
		searchParams.set("q", params.q);
	}

	if (params.action) {
		searchParams.set("action", params.action);
	}

	if (params.resourceType) {
		searchParams.set("resourceType", params.resourceType);
	}

	return fetchJson(
		`/guilds/${guildId}/audit-log?${searchParams.toString()}`,
		{ method: "GET" },
		AuditLogPageSchema,
	);
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
	const headers = await buildHeaders({ method: "DELETE" });
	const response = await fetch(`${getApiBaseUrl()}/guilds/${guildId}/auto-responses/${responseId}`, {
		method: "DELETE",
		headers,
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error(await readError(response));
	}
}
