import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { GuildCard } from "../src/components/guild-card";

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
}));

describe("GuildCard", () => {
	it("links to the guild-scoped settings route", () => {
		render(
			<GuildCard
				guild={{
					guildId: "guild-1",
					name: "Sunset Crew",
					iconUrl: null,
					isOwner: true,
				}}
			/>,
		);

		expect(screen.getByRole("link")).toHaveAttribute("href", "/guilds/guild-1/settings");
	});
});
