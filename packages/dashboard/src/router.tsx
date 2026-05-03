import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

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
		defaultPreload: false,
		scrollRestoration: true,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
