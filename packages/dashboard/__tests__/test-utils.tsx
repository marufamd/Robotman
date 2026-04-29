import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
}

export function renderWithQueryClient(
	ui: ReactElement,
	{ client = createTestQueryClient() }: { client?: QueryClient } = {},
) {
	function Wrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
	}

	return {
		client,
		...render(ui, { wrapper: Wrapper }),
	};
}
