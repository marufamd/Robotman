import type { AutoResponse } from "@robotman/shared";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { startTransition, useState } from "react";
import { AutoResponseEditor } from "~/components/auto-response-editor";
import { AutoResponseTable } from "~/components/auto-response-table";
import { PageHero } from "~/components/page-hero";
import { deleteAutoResponse } from "~/lib/api";
import {
	autoResponsesQueryOptions,
	invalidateAutoResponses,
} from "~/lib/queries";

export function AutoResponsesPage() {
	const queryClient = useQueryClient();
	const { guildId } = useParams({ strict: false });

	if (!guildId) {
		return null;
	}

	const { data: responses } = useSuspenseQuery(autoResponsesQueryOptions(guildId));
	const [selectedResponse, setSelectedResponse] = useState<AutoResponse | undefined>(responses[0]);

	const deleteMutation = useMutation({
		mutationFn: (response: AutoResponse) => deleteAutoResponse(guildId, response.id),
		onSuccess: async (_, response) => {
			await invalidateAutoResponses(queryClient, guildId);
			if (selectedResponse?.id === response.id) {
				startTransition(() => setSelectedResponse(undefined));
			}
		},
	});

	return (
		<section className="space-y-6">
			<PageHero
				eyebrow="Automation Engine"
				title="Design live auto responses"
				description="Search active triggers, edit response payloads, and preview the exact Discord output before you save."
				badge={`${responses.length} Active Triggers`}
			/>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<AutoResponseTable
					onDelete={(response) => deleteMutation.mutate(response)}
					onEdit={(response) => startTransition(() => setSelectedResponse(response))}
					responses={responses}
					selectedId={selectedResponse?.id}
				/>

				<AutoResponseEditor
					guildId={guildId}
					key={selectedResponse?.id ?? "new"}
					onResetSelection={() => startTransition(() => setSelectedResponse(undefined))}
					onSaved={(response) => setSelectedResponse(response)}
					selectedResponse={selectedResponse}
				/>
			</div>

			{deleteMutation.error ? (
				<p className="text-sm text-red-200">{deleteMutation.error.message}</p>
			) : null}
		</section>
	);
}
