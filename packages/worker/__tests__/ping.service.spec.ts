import {
	PingService,
	type PingCommandResult,
} from "../src/commands/utilities/ping/ping.service";

describe("PingService", () => {
	it("returns a sunset-colored Pong embed payload", () => {
		const service = new PingService();
		const result = service.execute();

		const expected: PingCommandResult = {
			embeds: [
				{
					color: 0xffb700,
					description: "Pong!",
					title: "Pong!",
				},
			],
		};

		expect(result).toEqual(expected);
	});
});
