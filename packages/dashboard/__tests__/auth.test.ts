import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { requireSession } from "../src/lib/auth";

describe("requireSession", () => {
	it("returns the session when one is available", async () => {
		const queryClient = {
			ensureQueryData: vi.fn().mockResolvedValue({
				userId: "1",
				username: "Maruf",
				avatarUrl: null,
			}),
		} as unknown as QueryClient;

		await expect(requireSession(queryClient, "/guilds")).resolves.toMatchObject({
			userId: "1",
			username: "Maruf",
		});
	});

	it("redirects to login when the session is missing", async () => {
		const queryClient = {
			ensureQueryData: vi.fn().mockResolvedValue(null),
		} as unknown as QueryClient;

		// In TanStack Router v1.168+ redirect() throws a Response with a 307 status
		const thrown = await requireSession(queryClient, "/guilds").catch(
			(e: unknown) => e,
		);

		expect(thrown).toBeInstanceOf(Response);
		expect((thrown as Response).status).toBe(307);
	});
});
