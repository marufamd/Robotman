import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { GuildSettingsForm } from "~/components/guild-settings-form";
import { PageHero } from "~/components/page-hero";
import { guildSettingsQueryOptions } from "~/lib/queries";

export function GuildSettingsPage() {
	const { guildId } = useParams({ strict: false });

	if (!guildId) {
		return null;
	}

	const { data: settings } = useSuspenseQuery(guildSettingsQueryOptions(guildId));

	return (
		<section>
			<PageHero
				eyebrow="Server Settings"
				title="Tune your guild defaults"
				description="Set command behavior, moderation logging, and ranking controls from a single dark-mode surface."
				badge={`Guild ${guildId}`}
			/>
			<GuildSettingsForm initialSettings={settings} />
		</section>
	);
}
