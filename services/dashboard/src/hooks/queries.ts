import type { ActionHistory, AutoResponse } from '@robotman/types';
import type { APIError, ErrorData } from '#utils/util';
import { fetchAPI } from '#utils/util';
import { useQuery } from 'react-query';

type QueryError = APIError & ErrorData;

export function useQueryResponses(guild: string) {
	return useQuery<AutoResponse[], QueryError>(['guilds', guild, 'responses'], () => fetchAPI<AutoResponse[]>(`/responses?guild=${guild}`));
}

export function useQueryResponse(guild: string, id: number, enabled = false) {
	return useQuery<AutoResponse, QueryError>(['guilds', guild, 'responses', id], () => fetchAPI<AutoResponse>(`/responses/${id}`), {
		enabled
	});
}

export function useQueryHistory(guild: string) {
	return useQuery<ActionHistory[], QueryError>(['guilds', guild, 'history'], () => fetchAPI<ActionHistory[]>(`/history?guild=${guild}`));
}
