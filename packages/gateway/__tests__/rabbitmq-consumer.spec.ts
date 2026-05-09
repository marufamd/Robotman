import { Buffer } from "node:buffer";

import type { ConsumeMessage } from "amqplib";
import { EventType } from "@robotman/shared";

import {
	RabbitMqConsumer,
	type RabbitMqConsumerChannel,
	type RabbitMqConsumerConnection,
} from "../src/rabbitmq-consumer";

describe("RabbitMqConsumer", () => {
	it("binds the queue to outbound routing keys and acks handled messages", async () => {
		let onMessage: ((message: ConsumeMessage | null) => void | Promise<void>) | null =
			null;
		const channel: RabbitMqConsumerChannel = {
			ack: jest.fn(),
			assertExchange: jest.fn(async () => undefined),
			assertQueue: jest.fn(async () => undefined),
			bindQueue: jest.fn(async () => undefined),
			close: jest.fn(async () => undefined),
			consume: jest.fn(async (_queue, handler) => {
				onMessage = handler;
			}),
			nack: jest.fn(),
		};
		const connection: RabbitMqConsumerConnection = {
			close: jest.fn(async () => undefined),
			createChannel: jest.fn(async () => channel),
		};
		const connector = jest.fn(async () => connection);
		const eventHandler = {
			handleEvent: jest.fn(async () => undefined),
		};
		const consumer = new RabbitMqConsumer({
			connectionUrl: "amqp://localhost",
			connector,
			eventHandler,
			exchange: "robotman.events",
			logger: { error: jest.fn(), info: jest.fn() },
			queue: "gateway.queue",
			routingKeys: [
				EventType.DISCORD_OUTBOUND_MESSAGE,
				EventType.DISCORD_OUTBOUND_REPLY,
			],
		});

		await consumer.start();

		expect(connector).toHaveBeenCalledWith("amqp://localhost");
		expect(channel.assertExchange).toHaveBeenCalledWith("robotman.events", "topic", {
			durable: true,
		});
		expect(channel.assertQueue).toHaveBeenCalledWith("gateway.queue", {
			durable: true,
		});
		expect(channel.bindQueue).toHaveBeenCalledWith(
			"gateway.queue",
			"robotman.events",
			EventType.DISCORD_OUTBOUND_MESSAGE,
		);
		expect(channel.bindQueue).toHaveBeenCalledWith(
			"gateway.queue",
			"robotman.events",
			EventType.DISCORD_OUTBOUND_REPLY,
		);

		const message = {
			content: Buffer.from(
				JSON.stringify({
					data: {
						eventId: "event-1",
						payload: {
							channelId: "channel-1",
							content: "pong",
						},
						timestamp: "2026-05-03T00:00:00.000Z",
						type: EventType.DISCORD_OUTBOUND_MESSAGE,
					},
					pattern: EventType.DISCORD_OUTBOUND_MESSAGE,
				}),
			),
		} as ConsumeMessage;

		expect(onMessage).not.toBeNull();
			if (!onMessage) {
				throw new Error("Expected onMessage handler to be registered");
			}

			const handler = onMessage as (
				message: ConsumeMessage | null,
			) => void | Promise<void>;
			await handler(message);

		expect(eventHandler.handleEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: EventType.DISCORD_OUTBOUND_MESSAGE,
			}),
		);
		expect(channel.ack).toHaveBeenCalledWith(message);
		expect(channel.nack).not.toHaveBeenCalled();
	});

	it("nacks messages without requeue when handling fails", async () => {
		let onMessage: ((message: ConsumeMessage | null) => void | Promise<void>) | null =
			null;
		const channel: RabbitMqConsumerChannel = {
			ack: jest.fn(),
			assertExchange: jest.fn(async () => undefined),
			assertQueue: jest.fn(async () => undefined),
			bindQueue: jest.fn(async () => undefined),
			close: jest.fn(async () => undefined),
			consume: jest.fn(async (_queue, handler) => {
				onMessage = handler;
			}),
			nack: jest.fn(),
		};
		const connection: RabbitMqConsumerConnection = {
			close: jest.fn(async () => undefined),
			createChannel: jest.fn(async () => channel),
		};
		const consumer = new RabbitMqConsumer({
			connectionUrl: "amqp://localhost",
			connector: jest.fn(async () => connection),
			eventHandler: {
				handleEvent: jest.fn(async () => {
					throw new Error("boom");
				}),
			},
			exchange: "robotman.events",
			logger: { error: jest.fn(), info: jest.fn() },
			queue: "gateway.queue",
			routingKeys: [EventType.DISCORD_OUTBOUND_MESSAGE],
		});

		await consumer.start();

		const message = {
			content: Buffer.from("{bad json"),
		} as ConsumeMessage;

		expect(onMessage).not.toBeNull();
			if (!onMessage) {
				throw new Error("Expected onMessage handler to be registered");
			}

			const handler = onMessage as (
				message: ConsumeMessage | null,
			) => void | Promise<void>;
			await handler(message);

		expect(channel.ack).not.toHaveBeenCalled();
		expect(channel.nack).toHaveBeenCalledWith(message, false, false);
	});
});
