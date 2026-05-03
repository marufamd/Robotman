import { createFileRoute, redirect } from "@tanstack/react-router";
import { sessionQueryOptions } from "~/lib/queries";

export const Route = createFileRoute("/")({
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.ensureQueryData(sessionQueryOptions());

		throw redirect({
			to: session ? "/guilds" : "/login",
		});
	},
	component: () => null,
});
