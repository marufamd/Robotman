import {
	formatHexColor,
	parseLeaderboardColorArgument,
} from "../src/commands/utilities/leaderboard/color-utils";

describe("leaderboard color utils", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("parses hexadecimal, integer, rgb, and named colors", () => {
		expect(parseLeaderboardColorArgument("#FFB700")).toBe(0xffb700);
		expect(parseLeaderboardColorArgument("0xFFB700")).toBe(0xffb700);
		expect(parseLeaderboardColorArgument("230 126 34")).toBe(0xe67e22);
		expect(parseLeaderboardColorArgument("dark orange")).toBe(0xff8c00);
	});

	it("supports RANDOM and DEFAULT", () => {
		jest.spyOn(Math, "random").mockReturnValue(0);

		expect(parseLeaderboardColorArgument("RANDOM")).toBe(0);
		expect(parseLeaderboardColorArgument("DEFAULT")).toBe(0);
	});

	it("formats rgb integers as uppercase hex", () => {
		expect(formatHexColor(0xffb700)).toBe("#FFB700");
	});
});
