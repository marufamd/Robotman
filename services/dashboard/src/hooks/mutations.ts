import type { AutoResponse, AutoResponsePayload, DeletePayload } from '@robotman/types';
import { fetchAPI } from '#utils/util';
import { useMutation, useQueryClient } from 'react-query';

export function useMutationInsertResponse(guild: string) {
	const client = useQueryClient();

	return useMutation<AutoResponse, unknown, AutoResponsePayload>(
		async (payload) => {
			const data = await fetchAPI<AutoResponse>('/responses', {
				method: 'POST',
				body: JSON.stringify(payload)
			});

			return data;
		},
		{
			onSuccess: () => {
				void client.invalidateQueries(['guilds', guild]);
			}
		}
	);
}

export function useMutationUpdateResponse(guild: string, id: number) {
	const client = useQueryClient();

	return useMutation<AutoResponse, unknown, AutoResponsePayload>(
		async (payload) => {
			const data = await fetchAPI<AutoResponse>(`/responses/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(payload)
			});

			return data;
		},
		{
			onSuccess: () => {
				void client.invalidateQueries(['guilds', guild]);
			}
		}
	);
}

export function useMutationDeleteResponse(guild: string, id: number) {
	const client = useQueryClient();

	return useMutation<AutoResponse, unknown, DeletePayload>(
		async (payload) => {
			const data = await fetchAPI<AutoResponse>(`/responses/${id}`, {
				method: 'DELETE',
				body: JSON.stringify(payload)
			});

			return data;
		},
		{
			onSuccess: () => {
				void client.invalidateQueries(['guilds', guild]);
			}
		}
	);
}
