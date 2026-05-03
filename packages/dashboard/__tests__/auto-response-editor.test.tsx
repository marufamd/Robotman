import { AutoResponseType } from "@robotman/shared";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AutoResponseEditor } from "../src/components/auto-response-editor";
import { renderWithQueryClient } from "./test-utils";

const session = {
	userId: "user-1",
	username: "maruf",
	displayName: "Maruf",
	avatarUrl: "https://cdn.example.com/maruf.png",
};

const guild = {
	guildId: "guild-1",
	name: "Robotman HQ",
	iconUrl: null,
	isOwner: true,
};

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
		invalidateAutoResponses: (...args: unknown[]) =>
			invalidateAutoResponses(...args),
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
			trigger: "hello",
			type: AutoResponseType.Regular,
			content: "Pong!",
			aliases: ["hello", "ping"],
			wildcard: false,
			embed: false,
			embedColor: 16747575,
			createdBy: "Robotman",
			lastEditedBy: null,
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
				guild={guild}
				onCancel={() => {}}
				onSaved={onSaved}
				session={session}
			/>,
		);

		fireEvent.change(screen.getByLabelText(/trigger/i), {
			target: { value: "hello" },
		});
		await user.selectOptions(screen.getByLabelText(/^type$/i), "Regular");
		await user.click(screen.getByRole("button", { name: /add alias/i }));
		fireEvent.change(screen.getByLabelText(/alias 1/i), {
			target: { value: "hello" },
		});
		await user.click(screen.getByRole("button", { name: /add alias/i }));
		fireEvent.change(screen.getByLabelText(/alias 2/i), {
			target: { value: "ping" },
		});
		fireEvent.change(
			screen.getByLabelText(/response/i),
			"Hi {username} from {server} in {channel}",
		);

		expect(screen.getByText("maruf")).toBeInTheDocument();
		expect(screen.getByText("Robotman HQ")).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: /save response/i }),
		);

		await waitFor(() => {
			expect(createAutoResponse).toHaveBeenCalledWith("guild-1", {
				guildId: "guild-1",
				trigger: "hello",
				type: AutoResponseType.Regular,
				content: "Hi {username} from {server} in {channel}",
				aliases: ["hello", "ping"],
				wildcard: false,
				embed: false,
				embedColor: 16747575,
			});
		});

		expect(onSaved).toHaveBeenCalled();
	});
});
