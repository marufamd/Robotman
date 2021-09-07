import type { ActionHistory, AutoResponse } from '@robotman/types';
import { fetchAPI } from '#utils/util';
import { useQuery } from 'react-query';

export function useQueryResponses(guild: string) {
	return useQuery<AutoResponse[]>(['guilds', guild, 'responses'], () => fetchAPI<AutoResponse[]>(`/responses?guild=${guild}`));
}

export function useQueryResponse(guild: string, id: number, enabled = false) {
	return useQuery<AutoResponse>(['guilds', guild, 'responses', id], () => fetchAPI<AutoResponse>(`/responses/${id}`), {
		enabled
	});
}

export function useQueryHistory(guild: string) {
	return useQuery<ActionHistory[]>(['guilds', guild, 'history'], () => fetchAPI<ActionHistory[]>(`/history?guild=${guild}`));
}
