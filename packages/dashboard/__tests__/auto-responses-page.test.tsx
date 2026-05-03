import { AutoResponseType } from "@robotman/shared";
import { screen } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoResponsesPage, Route } from "../src/routes/_authenticated/guilds/$guildId/auto-responses/index";
import { renderWithQueryClient } from "./test-utils";

vi.mock("../src/components/auto-response-table", () => ({
	AutoResponseTable: ({ responses }: { responses: Array<{ trigger: string }> }) => (
		<div data-testid="auto-response-table">{responses.map((response) => response.trigger).join(",")}</div>
	),
}));

vi.mock("../src/components/page-hero", () => ({
	PageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

describe("AutoResponsesPage", () => {
	beforeEach(() => {
		vi.spyOn(Route, "useParams").mockReturnValue({ guildId: "guild-1" } as never);
	});

	it("renders responses loaded from auto-responses query cache", () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
		client.setQueryData(["auto-responses", "guild-1"], [
			{
				id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
				guildId: "guild-1",
				name: "hello",
				trigger: "hello",
				type: AutoResponseType.Regular,
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
		]);
		client.setQueryData(["guilds"], [
			{
				guildId: "guild-1",
				name: "Cyber-Dynamics Server",
				iconUrl: null,
				isOwner: true,
			},
		]);
		renderWithQueryClient(<AutoResponsesPage />, { client });

		expect(screen.getByText("Cyber-Dynamics Server Auto Responses")).toBeInTheDocument();
		expect(screen.getByTestId("auto-response-table")).toHaveTextContent("hello");
	});
});
