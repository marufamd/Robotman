import { AuditLogAction, AuditLogResourceType, AutoResponseType } from "@robotman/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createAutoResponse,
	deleteAutoResponse,
	getCurrentSession,
	listAuditLog,
	listAutoResponses,
	updateAutoResponse,
} from "../src/lib/api";

describe("getCurrentSession", () => {
	beforeEach(() => {
		vi.stubEnv("DASHBOARD_API_BASE_URL", "http://localhost:3001");
		vi.unstubAllGlobals();
	});

	it("returns null when the session endpoint returns 401", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(null, {
					status: 401,
				}),
			),
		);

		await expect(getCurrentSession()).resolves.toBeNull();
	});

	it("returns null when the session fetch fails", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

		await expect(getCurrentSession()).resolves.toBeNull();
	});
});

describe("auto response api helpers", () => {
	beforeEach(() => {
		vi.stubEnv("DASHBOARD_API_BASE_URL", "http://localhost:3001");
		vi.unstubAllGlobals();
	});

	it("lists auto responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify([
						{
							id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
							guildId: "guild-1",
							name: "hello",
							trigger: "hello",
							type: "Regular",
							content: "Pong!",
							aliases: ["hello"],
							wildcard: false,
							embed: false,
							embedColor: 16747575,
							createdBy: "Robotman",
							lastEditedBy: null,
							createdAt: "2026-04-28T12:00:00.000Z",
							updatedAt: "2026-04-28T12:00:00.000Z",
						},
					]),
					{ status: 200 },
				),
			),
		);

		await expect(listAutoResponses("guild-1")).resolves.toHaveLength(1);
		expect(fetch).toHaveBeenCalledWith(
			"http://localhost:3001/guilds/guild-1/auto-responses",
			expect.objectContaining({
				credentials: "include",
				method: "GET",
			}),
		);
	});

	it("creates, updates, and deletes auto responses with csrf token", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ csrfToken: "csrf-1" }), { status: 200 }),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
						guildId: "guild-1",
						name: "hello",
						trigger: "hello",
						type: "Regular",
						content: "Pong!",
						aliases: ["hello"],
						wildcard: false,
						embed: false,
						embedColor: 16747575,
						createdBy: "Robotman",
						lastEditedBy: null,
						createdAt: "2026-04-28T12:00:00.000Z",
						updatedAt: "2026-04-28T12:00:00.000Z",
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
						guildId: "guild-1",
						name: "hello",
						trigger: "hello",
						type: "Regular",
						content: "Updated!",
						aliases: ["hello"],
						wildcard: false,
						embed: false,
						embedColor: 16747575,
						createdBy: "Robotman",
						lastEditedBy: "Robotman",
						createdAt: "2026-04-28T12:00:00.000Z",
						updatedAt: "2026-04-28T12:01:00.000Z",
					}),
					{ status: 200 },
				),
			)
			.mockResolvedValueOnce(new Response(null, { status: 204 }));

		vi.stubGlobal("fetch", fetchMock);

		await createAutoResponse("guild-1", {
			guildId: "guild-1",
			trigger: "hello",
			type: AutoResponseType.Regular,
			content: "Pong!",
			aliases: ["hello"],
			wildcard: false,
			embed: false,
			embedColor: 16747575,
		});
		await updateAutoResponse("guild-1", "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee", {
			guildId: "guild-1",
			trigger: "hello",
			type: AutoResponseType.Moderator,
			content: "Updated!",
			aliases: ["hello"],
			wildcard: false,
			embed: false,
			embedColor: 16747575,
		});
		await deleteAutoResponse("guild-1", "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee");

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"http://localhost:3001/csrf",
			expect.objectContaining({ credentials: "include" }),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"http://localhost:3001/guilds/guild-1/auto-responses",
			expect.objectContaining({
				credentials: "include",
				method: "POST",
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			3,
			"http://localhost:3001/guilds/guild-1/auto-responses/2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
			expect.objectContaining({
				credentials: "include",
				method: "PATCH",
			}),
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			4,
			"http://localhost:3001/guilds/guild-1/auto-responses/2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
			expect.objectContaining({
				credentials: "include",
				method: "DELETE",
			}),
		);
	});
});

describe("audit log api helpers", () => {
	beforeEach(() => {
		vi.stubEnv("DASHBOARD_API_BASE_URL", "http://localhost:3001");
		vi.unstubAllGlobals();
	});

	it("lists paginated audit log entries with filters", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						entries: [
							{
								id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
								guildId: "guild-1",
								userId: "user-1",
								userUsername: "Robotman",
								action: "UPDATE",
								resourceType: "AUTO_RESPONSE",
								resourceId: "response-1",
								resourceName: "welcome",
								changes: {
									before: { trigger: "welcome" },
									after: { trigger: "welcome-back" },
								},
								createdAt: "2026-04-28T12:00:00.000Z",
							},
						],
						page: 2,
						pageSize: 25,
						total: 51,
						totalPages: 3,
					}),
					{ status: 200 },
				),
			),
		);

		await expect(
			listAuditLog("guild-1", {
				page: 2,
				pageSize: 25,
				q: "welcome",
				action: AuditLogAction.Update,
				resourceType: AuditLogResourceType.AutoResponse,
			}),
		).resolves.toMatchObject({
			page: 2,
			pageSize: 25,
			total: 51,
			totalPages: 3,
		});
		expect(fetch).toHaveBeenCalledWith(
			"http://localhost:3001/guilds/guild-1/audit-log?page=2&pageSize=25&q=welcome&action=UPDATE&resourceType=AUTO_RESPONSE",
			expect.objectContaining({
				credentials: "include",
				method: "GET",
			}),
		);
	});
});
