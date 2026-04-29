import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AutoResponseTable } from "../src/components/auto-response-table";
import { renderWithQueryClient } from "./test-utils";

const responses = [
	{
		id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
		guildId: "guild-1",
		name: "hello",
		type: "regex",
		content: "Hi there!",
		aliases: ["hello"],
		wildcard: false,
		embed: false,
		embedColor: 16747575,
		createdAt: "2026-04-28T12:00:00.000Z",
		updatedAt: "2026-04-28T12:00:00.000Z",
	},
	{
		id: "cbf7377d-c4c6-4f72-acb2-9f8c87390456",
		guildId: "guild-1",
		name: "welcome",
		type: "wildcard",
		content: "Welcome aboard!",
		aliases: ["welcome"],
		wildcard: true,
		embed: false,
		embedColor: 16747575,
		createdAt: "2026-04-28T12:00:00.000Z",
		updatedAt: "2026-04-28T12:00:00.000Z",
	},
];

describe("AutoResponseTable", () => {
	it("filters rows and emits edit/delete actions", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		const onDelete = vi.fn();

		renderWithQueryClient(
			<AutoResponseTable
				onDelete={onDelete}
				onEdit={onEdit}
				responses={responses}
			/>,
		);

		await user.type(screen.getByPlaceholderText(/search trigger names/i), "welcome");

		// "welcome" appears in both the name cell and the aliases cell
		expect(screen.getAllByText("welcome").length).toBeGreaterThan(0);
		expect(screen.queryByText("hello")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /edit/i }));
		await user.click(screen.getByRole("button", { name: /delete/i }));

		expect(onEdit).toHaveBeenCalledWith(responses[1]);
		expect(onDelete).toHaveBeenCalledWith(responses[1]);
	});
});
