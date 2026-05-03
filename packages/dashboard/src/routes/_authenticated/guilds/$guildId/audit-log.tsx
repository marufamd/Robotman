import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AuditLogExplorer } from "~/components/audit-log-explorer";
import { PageHero } from "~/components/page-hero";
import {
	auditLogQueryOptions,
	DEFAULT_AUDIT_LOG_FILTERS,
	guildsQueryOptions,
} from "~/lib/queries";

export const Route = createFileRoute(
	"/_authenticated/guilds/$guildId/audit-log",
)({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				auditLogQueryOptions(params.guildId, DEFAULT_AUDIT_LOG_FILTERS),
			),
			context.queryClient.ensureQueryData(guildsQueryOptions()),
		]);
	},
	component: AuditLogPage,
});

export function AuditLogPage() {
	const { guildId } = Route.useParams();
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());
	const guild = guilds.find((entry) => entry.guildId === guildId);

	return (
		<section className="space-y-6">
			<PageHero
				eyebrow="Server History"
				title={guild?.name ? `${guild.name} Audit Log` : "Audit Log"}
				description="Review every recorded settings and auto-response change for this server."
				badge={`Server ID: ${guildId}`}
				iconUrl={guild?.iconUrl}
			/>
			<AuditLogExplorer guildId={guildId} />
		</section>
	);
}
