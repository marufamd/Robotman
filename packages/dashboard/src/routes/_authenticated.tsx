import { useSuspenseQuery } from "@tanstack/react-query";
import { DashboardShell } from "~/components/dashboard-shell";
import { sessionQueryOptions } from "~/lib/queries";

export function AuthenticatedLayout() {
	const { data: session } = useSuspenseQuery(sessionQueryOptions());

	if (!session) {
		return null;
	}

	return <DashboardShell session={session} />;
}
