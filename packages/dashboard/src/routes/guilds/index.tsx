import { useSuspenseQuery } from "@tanstack/react-query";
import { GuildCard } from "~/components/guild-card";
import { PageHero } from "~/components/page-hero";
import { guildsQueryOptions } from "~/lib/queries";

export function GuildSelectionPage() {
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());

	return (
		<section>
			<PageHero
				eyebrow="Guild Routing"
				title="Choose a server to manage"
				description="Jump into settings and automations for the communities where your account already has access."
				badge={`${guilds.length} Connected Guilds`}
			/>
			<div className="grid gap-6 xl:grid-cols-2">
				{guilds.map((guild) => (
					<GuildCard guild={guild} key={guild.guildId} />
				))}
			</div>
		</section>
	);
}
