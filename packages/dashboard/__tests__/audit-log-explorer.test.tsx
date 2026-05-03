import {
	AuditLogAction,
	AuditLogResourceType,
} from "@robotman/shared";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditLogExplorer } from "../src/components/audit-log-explorer";
import { renderWithQueryClient } from "./test-utils";

const listAuditLog = vi.fn();

vi.mock("../src/lib/api", async () => {
	const actual = await vi.importActual("../src/lib/api");

	return {
		...actual,
		listAuditLog: (...args: unknown[]) => listAuditLog(...args),
	};
});

const defaultPage = {
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
				before: { trigger: "welcome", embed: false },
				after: { trigger: "welcome-back", embed: true },
			},
			createdAt: "2026-04-28T12:00:00.000Z",
		},
	],
	page: 1,
	pageSize: 25,
	total: 2,
	totalPages: 2,
};

const filteredPage = {
	entries: [
		{
			id: "cbf7377d-c4c6-4f72-acb2-9f8c87390456",
			guildId: "guild-1",
			userId: "user-1",
			userUsername: "Robotman",
			action: AuditLogAction.Update,
			resourceType: AuditLogResourceType.GuildSettings,
			resourceId: "guild-1",
			resourceName: "Server Settings",
			changes: {
				before: { prefix: "!" },
				after: { prefix: "?" },
			},
			createdAt: "2026-04-28T13:00:00.000Z",
		},
	],
	page: 1,
	pageSize: 25,
	total: 1,
	totalPages: 1,
};

const secondPage = {
	entries: [
		{
			...defaultPage.entries[0],
			id: "11111111-6e09-4726-b14c-6cff06d7d6ee",
			resourceName: "page-2-entry",
		},
	],
	page: 2,
	pageSize: 25,
	total: 26,
	totalPages: 2,
};

describe("AuditLogExplorer", () => {
	beforeEach(() => {
		listAuditLog.mockReset();
		listAuditLog.mockImplementation(
			async (
				_guildId: string,
				params: {
					page: number;
					pageSize: number;
					q?: string;
					action?: AuditLogAction;
					resourceType?: AuditLogResourceType;
				},
			) => {
				if (
					params.q === "server" &&
					params.action === AuditLogAction.Update &&
					params.resourceType === AuditLogResourceType.GuildSettings
				) {
					return filteredPage;
				}

				if (params.page === 2) {
					return secondPage;
				}

				return defaultPage;
			},
		);
	});

	it("filters, paginates, and shows change details", async () => {
		const user = userEvent.setup();

		renderWithQueryClient(
			<AuditLogExplorer
				guildId="guild-1"
			/>,
		);

		await waitFor(() => {
			expect(listAuditLog).toHaveBeenCalledWith("guild-1", {
				page: 1,
				pageSize: 25,
				q: undefined,
				action: undefined,
				resourceType: undefined,
			});
		});

		expect(screen.getByText("welcome-back")).toBeInTheDocument();
		expect(screen.getByText("Before")).toBeInTheDocument();
		expect(screen.getByText("After")).toBeInTheDocument();

		await user.clear(screen.getByLabelText(/search audit log/i));
		await user.type(screen.getByLabelText(/search audit log/i), "server");
		await user.selectOptions(screen.getByLabelText(/filter by action/i), "UPDATE");
		await user.selectOptions(
			screen.getByLabelText(/filter by resource type/i),
			"GUILD_SETTINGS",
		);

		await waitFor(() => {
			expect(listAuditLog).toHaveBeenCalledWith("guild-1", {
				page: 1,
				pageSize: 25,
				q: "server",
				action: AuditLogAction.Update,
				resourceType: AuditLogResourceType.GuildSettings,
			});
		});

		expect(screen.getByText("Server Settings")).toBeInTheDocument();

		await user.selectOptions(screen.getByLabelText(/filter by action/i), "ALL");
		await user.selectOptions(screen.getByLabelText(/filter by resource type/i), "ALL");
		await user.clear(screen.getByLabelText(/search audit log/i));

		await waitFor(() => {
			expect(listAuditLog).toHaveBeenCalledWith("guild-1", {
				page: 1,
				pageSize: 25,
				q: undefined,
				action: undefined,
				resourceType: undefined,
			});
		});

		await user.click(screen.getByRole("button", { name: /next/i }));

		await waitFor(() => {
			expect(listAuditLog).toHaveBeenCalledWith("guild-1", {
				page: 2,
				pageSize: 25,
				q: undefined,
				action: undefined,
				resourceType: undefined,
			});
		});

		expect(screen.getByText("page-2-entry")).toBeInTheDocument();
	});
});
