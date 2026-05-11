import { NestFactory } from "@nestjs/core";

import { GuildSettingsHydrationService } from "../src/hydration/guild-settings-hydration.service";
import { bootstrap } from "../src/main";
import { createMicroserviceOptions } from "../src/rabbitmq/rabbitmq.options";
import { WorkerModule } from "../src/worker.module";

jest.mock("@nestjs/core", () => ({
	NestFactory: {
		createMicroservice: jest.fn(),
	},
}));

jest.mock("../src/rabbitmq/rabbitmq.options", () => ({
	createMicroserviceOptions: jest.fn(),
}));

describe("worker bootstrap", () => {
	it("hydrates guild settings before starting the microservice listener", async () => {
		const hydrate = jest.fn().mockResolvedValue(undefined);
		const listen = jest.fn().mockResolvedValue(undefined);
		const get = jest.fn().mockReturnValue({ hydrate });

		(createMicroserviceOptions as jest.Mock).mockReturnValue({
			options: true,
		});
		(NestFactory.createMicroservice as jest.Mock).mockResolvedValue({
			get,
			listen,
		});

		await bootstrap();

		expect(NestFactory.createMicroservice).toHaveBeenCalledWith(
			WorkerModule,
			{ options: true },
		);
		expect(get).toHaveBeenCalledWith(GuildSettingsHydrationService);
		expect(hydrate).toHaveBeenCalledTimes(1);
		expect(listen).toHaveBeenCalledTimes(1);
		expect(hydrate.mock.invocationCallOrder[0]).toBeLessThan(
			listen.mock.invocationCallOrder[0],
		);
	});
});
