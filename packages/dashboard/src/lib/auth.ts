import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { sessionQueryOptions } from "./queries";

export async function requireSession(queryClient: QueryClient, redirectTo: string) {
	const session = await queryClient.ensureQueryData(sessionQueryOptions());

	if (!session) {
		throw redirect({
			to: "/login",
			search: {
				redirect: redirectTo,
			},
		});
	}

	return session;
}
