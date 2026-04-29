import { EventType, type RobotmanEvent } from "@robotman/shared";
import {
	RabbitMqPublisher,
	type RabbitMqChannel,
	type RabbitMqConnection,
} from "../src/rabbitmq-publisher";

describe("RabbitMqPublisher", () => {
	it("asserts the topic exchange and publishes JSON payloads", async () => {
		const channel: RabbitMqChannel = {
			assertExchange: jest.fn(async () => undefined),
			close: jest.fn(async () => undefined),
			publish: jest.fn(() => true),
		};
		const connection: RabbitMqConnection = {
			close: jest.fn(async () => undefined),
			createChannel: jest.fn(async () => channel),
		};
		const connector = jest.fn(async () => connection);
		const publisher = new RabbitMqPublisher({
			connectionUrl: "amqp://localhost",
			connector,
			exchange: "robotman.events",
		});
		const event: RobotmanEvent<{ guildId: string }> = {
			eventId: "event-1",
			payload: {
				guildId: "guild-1",
			},
			timestamp: "2026-04-27T12:00:00.000Z",
			type: EventType.DASHBOARD_SETTINGS_UPDATED,
		};

		await publisher.connect();
		await publisher.publish(event);

		expect(connector).toHaveBeenCalledWith("amqp://localhost");
		expect(channel.assertExchange).toHaveBeenCalledWith("robotman.events", "topic", {
			durable: true,
		});
		expect(channel.publish).toHaveBeenCalledWith(
			"robotman.events",
			EventType.DASHBOARD_SETTINGS_UPDATED,
			expect.any(Buffer),
			expect.objectContaining({
				contentType: "application/json",
				persistent: true,
				type: EventType.DASHBOARD_SETTINGS_UPDATED,
			}),
		);

		const [, , body] = (channel.publish as jest.Mock).mock.calls[0];
		expect(JSON.parse(body.toString("utf8"))).toEqual(event);
	});

	it("throws when publish is called before connect", async () => {
		const publisher = new RabbitMqPublisher({
			connectionUrl: "amqp://localhost",
			exchange: "robotman.events",
		});

		await expect(
			publisher.publish({
				eventId: "event-1",
				payload: {},
				timestamp: "2026-04-27T12:00:00.000Z",
				type: EventType.DISCORD_MESSAGE,
			}),
		).rejects.toThrow("RabbitMQ publisher is not connected");
	});
});
