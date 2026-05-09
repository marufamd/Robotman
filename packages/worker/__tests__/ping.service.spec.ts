import {
	PingService,
	type PingCommandResult,
} from "../src/commands/utilities/ping/ping.service";

describe("PingService", () => {
	it("returns roundtrip latency when source timestamp is provided", () => {
		const service = new PingService();
		jest.spyOn(Date, "now").mockReturnValue(
			new Date("2026-04-28T00:00:00.250Z").getTime(),
		);

		const result = service.execute({
			sourceTimestamp: "2026-04-28T00:00:00.000Z",
		});

		const expected: PingCommandResult = {
			embeds: [
				{
					color: 0xffb700,
					description: "Pong! Roundtrip latency: 250ms",
					title: "Pong!",
				},
			],
		};

		expect(result).toEqual(expected);
	});

	it("falls back to base pong message when source timestamp is missing", () => {
		const service = new PingService();

		expect(service.execute()).toEqual({
			embeds: [
				{
					color: 0xffb700,
					description: "Pong!",
					title: "Pong!",
				},
			],
		});
	});
});
