import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardShell } from "../src/components/dashboard-shell";

const useLocation = vi.fn();
const useParams = vi.fn();
const useRouter = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		params,
		children,
		...props
	}: {
		to: string;
		params?: { guildId?: string };
		children: ReactNode;
	}) => (
		<a href={to.replace("$guildId", params?.guildId ?? "")} {...props}>
			{children}
		</a>
	),
	Outlet: () => <div data-testid="outlet" />,
	useLocation: () => useLocation(),
	useParams: () => useParams(),
	useRouter: () => useRouter(),
}));

describe("DashboardShell", () => {
	beforeEach(() => {
		vi.stubEnv("DASHBOARD_API_BASE_URL", "http://localhost:3001");
		vi.stubEnv("VITE_DISCORD_CLIENT_ID", "discord-client-id");
		useLocation.mockReturnValue({ pathname: "/guilds/guild-1/audit-log" });
		useParams.mockReturnValue({ guildId: "guild-1" });
		useRouter.mockReturnValue({ invalidate: vi.fn() });
	});

	it("shows the audit log link for guild routes and marks it active", () => {
		render(
			<DashboardShell
				session={{
					userId: "user-1",
					username: "robotman",
					displayName: "Robotman",
					avatarUrl: null,
				}}
			/>,
		);

		const auditLogLink = screen.getByRole("link", { name: /audit log/i });

		expect(auditLogLink).toHaveAttribute("href", "/guilds/guild-1/audit-log");
		expect(auditLogLink.className).toContain("text-sunset-400");
	});
});
