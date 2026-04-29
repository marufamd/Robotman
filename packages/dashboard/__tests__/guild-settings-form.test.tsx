import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GuildSettingsForm } from "../src/components/guild-settings-form";
import { renderWithQueryClient } from "./test-utils";

const updateGuildSettings = vi.fn();

vi.mock("../src/lib/api", () => ({
	updateGuildSettings: (...args: unknown[]) => updateGuildSettings(...args),
}));

describe("GuildSettingsForm", () => {
	beforeEach(() => {
		updateGuildSettings.mockReset();
		updateGuildSettings.mockResolvedValue({
			guildId: "guild-1",
			prefix: "!",
			isRankingEnabled: true,
			auditLogChannelId: null,
		});
	});

	it("rejects an invalid prefix before submitting", async () => {
		const user = userEvent.setup();

		renderWithQueryClient(
			<GuildSettingsForm
				initialSettings={{
					guildId: "guild-1",
					prefix: "!",
					isRankingEnabled: true,
					auditLogChannelId: null,
				}}
			/>,
		);

		// Use fireEvent to bypass the HTML maxLength attribute so only Zod validates
		const prefixInput = screen.getByLabelText(/prefix/i);
		fireEvent.change(prefixInput, { target: { value: "this-prefix-is-way-too-long" } });
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(updateGuildSettings).not.toHaveBeenCalled();
		expect(screen.getByText(/at most 15/i)).toBeInTheDocument();
	});

	it("submits a valid payload using shared schema parsing", async () => {
		const user = userEvent.setup();

		renderWithQueryClient(
			<GuildSettingsForm
				initialSettings={{
					guildId: "guild-1",
					prefix: "!",
					isRankingEnabled: true,
					auditLogChannelId: null,
				}}
			/>,
		);

		await user.clear(screen.getByLabelText(/prefix/i));
		await user.type(screen.getByLabelText(/prefix/i), "?");
		await user.clear(screen.getByLabelText(/audit log channel/i));
		await user.click(screen.getByRole("button", { name: /save settings/i }));

		expect(updateGuildSettings).toHaveBeenCalledWith("guild-1", {
			guildId: "guild-1",
			prefix: "?",
			isRankingEnabled: true,
			auditLogChannelId: null,
		});
	});
});
