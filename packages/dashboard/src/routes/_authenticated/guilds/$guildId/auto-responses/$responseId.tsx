import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AutoResponseEditor } from "~/components/auto-response-editor";
import {
	autoResponsesQueryOptions,
	guildsQueryOptions,
	sessionQueryOptions,
} from "~/lib/queries";

export const Route = createFileRoute("/_authenticated/guilds/$guildId/auto-responses/$responseId")({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(autoResponsesQueryOptions(params.guildId)),
			context.queryClient.ensureQueryData(sessionQueryOptions()),
			context.queryClient.ensureQueryData(guildsQueryOptions()),
		]);
	},
	component: EditAutoResponsePage,
});

function EditAutoResponsePage() {
	const { guildId, responseId } = Route.useParams();
	const navigate = useNavigate();
	const { data: responses } = useSuspenseQuery(autoResponsesQueryOptions(guildId));
	const { data: session } = useSuspenseQuery(sessionQueryOptions());
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());
	const guild = guilds.find((entry) => entry.guildId === guildId);

	const selectedResponse = responses.find((r) => r.id === responseId);

	if (!selectedResponse || !session || !guild) {
		return (
			<div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-night-950/40">
				<p className="text-night-200">Auto-response not found.</p>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full">
			<AutoResponseEditor
				guildId={guildId}
				guild={guild}
				selectedResponse={selectedResponse}
				onCancel={() => navigate({ to: "/guilds/$guildId/auto-responses", params: { guildId } })}
				onSaved={() => navigate({ to: "/guilds/$guildId/auto-responses", params: { guildId } })}
				session={session}
			/>
		</div>
	);
}
