import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoResponseEditor } from "../src/components/auto-response-editor";
import { renderWithQueryClient } from "./test-utils";

const createAutoResponse = vi.fn();
const updateAutoResponse = vi.fn();
const invalidateAutoResponses = vi.fn();

vi.mock("../src/lib/api", () => ({
	createAutoResponse: (...args: unknown[]) => createAutoResponse(...args),
	updateAutoResponse: (...args: unknown[]) => updateAutoResponse(...args),
}));

vi.mock("../src/lib/queries", async () => {
	const actual = await vi.importActual("../src/lib/queries");

	return {
		...actual,
		invalidateAutoResponses: (...args: unknown[]) => invalidateAutoResponses(...args),
	};
});

describe("AutoResponseEditor", () => {
	beforeEach(() => {
		createAutoResponse.mockReset();
		updateAutoResponse.mockReset();
		invalidateAutoResponses.mockReset();
		invalidateAutoResponses.mockResolvedValue(undefined);
		createAutoResponse.mockResolvedValue({
			id: "2a4ddc64-6e09-4726-b14c-6cff06d7d6ee",
			guildId: "guild-1",
			name: "hello",
			type: "regex",
			content: "Pong!",
			aliases: ["hello", "ping"],
			wildcard: false,
			embed: false,
			embedColor: 16747575,
			createdAt: "2026-04-28T12:00:00.000Z",
			updatedAt: "2026-04-28T12:00:00.000Z",
		});
	});

	it("updates the Discord preview live and submits create payloads", async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();

		renderWithQueryClient(
			<AutoResponseEditor
				guildId="guild-1"
				onResetSelection={vi.fn()}
				onSaved={onSaved}
			/>,
		);

		await user.type(screen.getByLabelText(/name/i), "hello");
		await user.clear(screen.getByLabelText(/type/i));
		await user.type(screen.getByLabelText(/type/i), "regex");
		// Use fireEvent for the array-backed aliases input to avoid controlled re-render interference
		fireEvent.change(screen.getByLabelText(/aliases/i), { target: { value: "hello, ping" } });
		await user.type(screen.getByLabelText(/reply content/i), "Pong!");

		expect(screen.getAllByText("Pong!")[0]).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /create trigger/i }));

		await waitFor(() => {
			expect(createAutoResponse).toHaveBeenCalledWith("guild-1", {
				guildId: "guild-1",
				name: "hello",
				type: "regex",
				content: "Pong!",
				aliases: ["hello", "ping"],
				wildcard: false,
				embed: false,
				embedColor: 16747575,
			});
		});

		expect(onSaved).toHaveBeenCalled();
	});
});
