import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DashboardShell } from "~/components/dashboard-shell";
import { requireSession } from "~/lib/auth";
import { sessionQueryOptions } from "~/lib/queries";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context, location }) => {
		await requireSession(context.queryClient, location.href);
	},
	component: AuthenticatedLayout,
});

export function AuthenticatedLayout() {
	const { data: session } = useSuspenseQuery(sessionQueryOptions());

	if (!session) {
		return null;
	}

	return <DashboardShell session={session} />;
}
