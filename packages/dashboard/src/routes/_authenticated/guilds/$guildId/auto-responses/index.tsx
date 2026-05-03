import type { AutoResponse } from "@robotman/shared";
import { createFileRoute } from "@tanstack/react-router";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { startTransition, useState } from "react";
import { Plus } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AutoResponseTable } from "~/components/auto-response-table";
import { PageHero } from "~/components/page-hero";
import { deleteAutoResponse } from "~/lib/api";
import {
	autoResponsesQueryOptions,
	guildsQueryOptions,
	invalidateAutoResponses,
} from "~/lib/queries";

export const Route = createFileRoute(
	"/_authenticated/guilds/$guildId/auto-responses/",
)({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				autoResponsesQueryOptions(params.guildId),
			),
			context.queryClient.ensureQueryData(guildsQueryOptions()),
		]);
	},
	component: AutoResponsesPage,
});

export function AutoResponsesPage() {
	const queryClient = useQueryClient();
	const { guildId } = Route.useParams();
	const { data: responses } = useSuspenseQuery(
		autoResponsesQueryOptions(guildId),
	);
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());
	const navigate = useNavigate();
	const guild = guilds.find((g) => g.guildId === guildId);

	const deleteMutation = useMutation({
		mutationFn: (response: AutoResponse) =>
			deleteAutoResponse(guildId, response.id),
		onSuccess: async () => {
			await invalidateAutoResponses(queryClient, guildId);
		},
	});

	return (
		<section className="space-y-6">
			<PageHero
				eyebrow="Automation Engine"
				title={
					guild?.name
						? `${guild.name} Auto Responses`
						: "Auto Responses"
				}
				description="Search active triggers, edit response payloads, and preview the exact Discord output before you save."
				badge={`${responses.length} Active Triggers`}
				iconUrl={guild?.iconUrl}
				action={
					<Link
						to="/guilds/$guildId/auto-responses/new"
						params={{ guildId }}
						className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sunset-400 to-sunset-500 px-4 py-2 text-sm font-bold !text-night-950 shadow-[0_4px_12px_rgba(255,140,55,0.2)] transition-all hover:brightness-110 hover:shadow-[0_6px_18px_rgba(255,140,55,0.3)] active:scale-95"
					>
						<Plus size={18} strokeWidth={2.5} />
						Add Response
					</Link>
				}
			/>

			<div className="w-full">
				<AutoResponseTable
					onDelete={(response) => deleteMutation.mutate(response)}
					onEdit={(response) =>
						navigate({
							to: "/guilds/$guildId/auto-responses/$responseId",
							params: { guildId, responseId: response.id },
						})
					}
					responses={responses}
				/>
			</div>

			{deleteMutation.error ? (
				<p className="text-sm text-red-200">
					{deleteMutation.error.message}
				</p>
			) : null}
		</section>
	);
}
