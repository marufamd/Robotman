import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AutoResponseEditor } from "~/components/auto-response-editor";
import { guildsQueryOptions, sessionQueryOptions } from "~/lib/queries";

export const Route = createFileRoute("/_authenticated/guilds/$guildId/auto-responses/new")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(sessionQueryOptions()),
			context.queryClient.ensureQueryData(guildsQueryOptions()),
		]);
	},
	component: NewAutoResponsePage,
});

function NewAutoResponsePage() {
	const { guildId } = Route.useParams();
	const navigate = useNavigate();
	const { data: session } = useSuspenseQuery(sessionQueryOptions());
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());
	const guild = guilds.find((entry) => entry.guildId === guildId);

	if (!session || !guild) {
		return null;
	}

	return (
		<div className="mx-auto w-full">
			<AutoResponseEditor
				guildId={guildId}
				guild={guild}
				onCancel={() => navigate({ to: "/guilds/$guildId/auto-responses", params: { guildId } })}
				onSaved={() => navigate({ to: "/guilds/$guildId/auto-responses", params: { guildId } })}
				session={session}
			/>
		</div>
	);
}
