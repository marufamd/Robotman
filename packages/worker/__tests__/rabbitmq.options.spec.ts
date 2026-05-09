import { Transport } from "@nestjs/microservices";

import {
	buildRabbitMqUrl,
	createMicroserviceOptions,
} from "../src/rabbitmq/rabbitmq.options";

describe("worker rabbitmq options", () => {
	const originalEnvironment = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnvironment };
	});

	it("uses the worker routing key from the environment when provided", () => {
		process.env.WORKER_ROUTING_KEY = "discord.message.create";

		expect(createMicroserviceOptions()).toEqual({
			options: expect.objectContaining({
				routingKey: "discord.message.create",
			}),
			transport: Transport.RMQ,
		});
	});

	it("defaults the worker routing key to both interaction and message create events", () => {
		delete process.env.WORKER_ROUTING_KEY;

		expect(createMicroserviceOptions()).toEqual({
			options: expect.objectContaining({
				routingKey: "discord.*.create",
			}),
			transport: Transport.RMQ,
		});
	});

	it("builds the rabbitmq url from the explicit url when present", () => {
		process.env.RABBITMQ_URL = "amqp://example";

		expect(buildRabbitMqUrl()).toBe("amqp://example");
	});
});
