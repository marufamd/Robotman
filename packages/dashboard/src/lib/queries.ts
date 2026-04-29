import type { QueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
	getCurrentSession,
	getGuildSettings,
	listAutoResponses,
	listGuilds,
} from "./api";

export const sessionQueryOptions = () =>
	queryOptions({
		queryKey: ["session"],
		queryFn: getCurrentSession,
	});

export const guildsQueryOptions = () =>
	queryOptions({
		queryKey: ["guilds"],
		queryFn: listGuilds,
	});

export const guildSettingsQueryOptions = (guildId: string) =>
	queryOptions({
		queryKey: ["guild-settings", guildId],
		queryFn: () => getGuildSettings(guildId),
	});

export const autoResponsesQueryOptions = (guildId: string) =>
	queryOptions({
		queryKey: ["auto-responses", guildId],
		queryFn: () => listAutoResponses(guildId),
	});

export function invalidateGuildSettings(queryClient: QueryClient, guildId: string) {
	return queryClient.invalidateQueries({ queryKey: ["guild-settings", guildId] });
}

export function invalidateAutoResponses(queryClient: QueryClient, guildId: string) {
	return queryClient.invalidateQueries({ queryKey: ["auto-responses", guildId] });
}
