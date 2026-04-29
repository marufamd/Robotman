import { QueryClient } from "@tanstack/react-query";
import { createRoute, createRouter, redirect } from "@tanstack/react-router";
import { requireSession } from "./lib/auth";
import {
	autoResponsesQueryOptions,
	guildSettingsQueryOptions,
	guildsQueryOptions,
	sessionQueryOptions,
} from "./lib/queries";
import { Route as rootRoute } from "./routes/__root";
import { AuthenticatedLayout } from "./routes/_authenticated";
import { AutoResponsesPage } from "./routes/guilds/$guildId/auto-responses";
import { GuildSettingsPage } from "./routes/guilds/$guildId/settings";
import { GuildSelectionPage } from "./routes/guilds/index";
import { LoginPage } from "./routes/login";

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.ensureQueryData(sessionQueryOptions());

		throw redirect({
			to: session ? "/guilds" : "/login",
		});
	},
	component: () => null,
});

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "login",
	component: LoginPage,
});

const authenticatedRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "authenticated",
	beforeLoad: async ({ context, location }) => {
		await requireSession(context.queryClient, location.href);
	},
	component: AuthenticatedLayout,
});

const guildsRoute = createRoute({
	getParentRoute: () => authenticatedRoute,
	path: "guilds",
	loader: ({ context }) => context.queryClient.ensureQueryData(guildsQueryOptions()),
	component: GuildSelectionPage,
});

const guildSettingsRoute = createRoute({
	getParentRoute: () => authenticatedRoute,
	path: "guilds/$guildId/settings",
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(guildSettingsQueryOptions(params.guildId)),
	component: GuildSettingsPage,
});

const autoResponsesRoute = createRoute({
	getParentRoute: () => authenticatedRoute,
	path: "guilds/$guildId/auto-responses",
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(autoResponsesQueryOptions(params.guildId)),
	component: AutoResponsesPage,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	loginRoute,
	authenticatedRoute.addChildren([guildsRoute, guildSettingsRoute, autoResponsesRoute]),
]);

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				staleTime: 30_000,
			},
		},
	});

	const router = createRouter({
		routeTree,
		context: {
			queryClient,
		},
		defaultPreload: "intent",
		scrollRestoration: true,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
