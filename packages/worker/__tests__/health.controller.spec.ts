import { Test, type TestingModule } from "@nestjs/testing";

import {
	HealthController,
	type HealthPingResponse,
} from "../src/health/health.controller";

describe("HealthController", () => {
	let controller: HealthController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [HealthController],
		}).compile();

		controller = module.get<HealthController>(HealthController);
	});

	it("returns an RMQ pong payload for health checks", () => {
		const response = controller.ping();

		const expected: HealthPingResponse = {
			service: "worker",
			status: "ok",
			transport: "rmq",
		};

		expect(response).toEqual(expected);
	});
});
