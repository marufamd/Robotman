import {
	AuditLogAction,
	AuditLogResourceType,
} from "@robotman/shared";
import { screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	AuditLogPage,
	Route,
} from "../src/routes/_authenticated/guilds/$guildId/audit-log";
import {
	auditLogQueryOptions,
	DEFAULT_AUDIT_LOG_FILTERS,
} from "../src/lib/queries";
import { renderWithQueryClient } from "./test-utils";

describe("AuditLogPage", () => {
	beforeEach(() => {
		vi.spyOn(Route, "useParams").mockReturnValue({ guildId: "guild-1" } as never);
	});

	it("renders prefetched audit log data for the guild", () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		client.setQueryData(
			auditLogQueryOptions("guild-1", DEFAULT_AUDIT_LOG_FILTERS).queryKey,
			{
			entries: [
				{
					id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
					guildId: "guild-1",
					userId: "user-1",
					userUsername: "Robotman",
					action: AuditLogAction.Update,
					resourceType: AuditLogResourceType.AutoResponse,
					resourceId: "response-1",
					resourceName: "welcome-back",
					changes: {
						before: { trigger: "welcome" },
						after: { trigger: "welcome-back" },
					},
					createdAt: "2026-04-28T12:00:00.000Z",
				},
			],
			page: 1,
			pageSize: 25,
			total: 1,
			totalPages: 1,
			},
		);
		client.setQueryData(["guilds"], [
			{
				guildId: "guild-1",
				name: "Cyber-Dynamics Server",
				iconUrl: null,
				isOwner: true,
			},
		]);

		renderWithQueryClient(<AuditLogPage />, { client });

		expect(screen.getByText("Audit Logs History")).toBeInTheDocument();
		expect(
			screen.getByText(/Review every recorded settings and auto-response change/i),
		).toBeInTheDocument();
		expect(screen.getByText("welcome-back")).toBeInTheDocument();
	});
});
