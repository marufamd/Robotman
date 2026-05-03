import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GuildSettingsForm } from "~/components/guild-settings-form";
import { PageHero } from "~/components/page-hero";
import { guildSettingsQueryOptions, guildsQueryOptions } from "~/lib/queries";

export const Route = createFileRoute(
	"/_authenticated/guilds/$guildId/settings",
)({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				guildSettingsQueryOptions(params.guildId),
			),
			context.queryClient.ensureQueryData(guildsQueryOptions()),
		]);
	},
	component: GuildSettingsPage,
});

export function GuildSettingsPage() {
	const { guildId } = Route.useParams();
	const { data: settings } = useSuspenseQuery(
		guildSettingsQueryOptions(guildId),
	);
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());

	const guild = guilds.find((g) => g.guildId === guildId);

	return (
		<section>
			<PageHero
				eyebrow="Server Settings"
				title={guild?.name ?? "Server Defaults"}
				description="Set command behavior, moderation logging, and ranking controls."
				badge={`Server ID: ${guildId}`}
				iconUrl={guild?.iconUrl}
			/>
			<GuildSettingsForm initialSettings={settings} />
		</section>
	);
}
