import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../src/routes/login";

describe("LoginPage", () => {
	beforeEach(() => {
		vi.stubEnv("DASHBOARD_API_BASE_URL", "http://localhost:3001");
		vi.stubEnv("DASHBOARD_DISCORD_OAUTH_URL", "https://discord.test/oauth");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ csrfToken: "csrf-token-123" }),
			}),
		);
	});

	it("renders the Discord OAuth form and omits guest access", async () => {
		render(<LoginPage />);

		await waitFor(() => {
			expect(screen.getByDisplayValue("csrf-token-123")).toBeInTheDocument();
		});

		const form = screen.getByRole("button", { name: /login with discord/i }).closest("form");

		expect(form).toHaveAttribute("action", "https://discord.test/oauth");
		expect(form).toHaveAttribute("method", "post");
		expect(screen.queryByText(/continue as guest/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/guest access/i)).not.toBeInTheDocument();
	});
});
