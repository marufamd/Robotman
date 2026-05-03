import type { AuditLogAction, AuditLogResourceType } from "@robotman/shared";
import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
	getCurrentSession,
	getGuildSettings,
	listAuditLog,
	listAutoResponses,
	listGuilds,
	type AuditLogQueryParams,
} from "./api";

export interface AuditLogFilters {
	page: number;
	pageSize: number;
	q?: string;
	action?: AuditLogAction;
	resourceType?: AuditLogResourceType;
}

export const DEFAULT_AUDIT_LOG_FILTERS: AuditLogFilters = {
	page: 1,
	pageSize: 25,
};

function normalizeAuditLogParams(params: AuditLogQueryParams): AuditLogQueryParams {
	return {
		page: params.page,
		pageSize: params.pageSize,
		q: params.q?.trim() || undefined,
		action: params.action,
		resourceType: params.resourceType,
	};
}

export const sessionQueryOptions = () =>
	queryOptions({
		queryKey: ["session"],
		queryFn: getCurrentSession,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

export const guildsQueryOptions = () =>
	queryOptions({
		queryKey: ["guilds"],
		queryFn: listGuilds,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

export const guildSettingsQueryOptions = (guildId: string) =>
	queryOptions({
		queryKey: ["guild-settings", guildId],
		queryFn: () => getGuildSettings(guildId),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

export const auditLogQueryOptions = (
	guildId: string,
	params: AuditLogQueryParams = DEFAULT_AUDIT_LOG_FILTERS,
) => {
	const normalizedParams = normalizeAuditLogParams(params);

	return queryOptions({
		queryKey: ["audit-log", guildId, normalizedParams],
		queryFn: () => listAuditLog(guildId, normalizedParams),
		staleTime: 30 * 1000,
	});
};

export const autoResponsesQueryOptions = (guildId: string) =>
	queryOptions({
		queryKey: ["auto-responses", guildId],
		queryFn: () => listAutoResponses(guildId),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

export function invalidateGuildSettings(queryClient: QueryClient, guildId: string) {
	return queryClient.invalidateQueries({ queryKey: ["guild-settings", guildId] });
}

export function invalidateAuditLog(queryClient: QueryClient, guildId: string) {
	return queryClient.invalidateQueries({ queryKey: ["audit-log", guildId] });
}

export function invalidateAutoResponses(queryClient: QueryClient, guildId: string) {
	return queryClient.invalidateQueries({ queryKey: ["auto-responses", guildId] });
}
