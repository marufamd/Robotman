import { Buffer } from "node:buffer";

import type { EventType, RobotmanEvent } from "@robotman/shared";
import { connect, type Options } from "amqplib";

export interface RabbitMqChannel {
	assertExchange(
		exchange: string,
		type: "topic",
		options?: Options.AssertExchange,
	): Promise<unknown>;
	publish(
		exchange: string,
		routingKey: string,
		content: Buffer,
		options?: Options.Publish,
	): boolean;
	close(): Promise<void>;
}

export interface RabbitMqConnection {
	createChannel(): Promise<RabbitMqChannel>;
	close(): Promise<void>;
}

export type RabbitMqConnector = (url: string) => Promise<RabbitMqConnection>;

export interface RobotmanPublisher {
	connect(): Promise<void>;
	publish<T>(event: RobotmanEvent<T>): Promise<void>;
	close(): Promise<void>;
}

export interface RabbitMqPublisherOptions {
	connectionUrl: string;
	exchange: string;
	connector?: RabbitMqConnector;
}

export class RabbitMqPublisher implements RobotmanPublisher {
	private connection: RabbitMqConnection | null = null;
	private channel: RabbitMqChannel | null = null;

	public constructor(private readonly options: RabbitMqPublisherOptions) {}

	public async connect(): Promise<void> {
		if (this.channel) {
			return;
		}

		const connector: RabbitMqConnector = this.options.connector ?? connect;

		this.connection = await connector(this.options.connectionUrl);
		this.channel = await this.connection.createChannel();
		await this.channel.assertExchange(this.options.exchange, "topic", {
			durable: true,
		});
	}

	public async publish<T>(event: RobotmanEvent<T>): Promise<void> {
		if (!this.channel) {
			throw new Error("RabbitMQ publisher is not connected");
		}

		this.channel.publish(
			this.options.exchange,
			event.type,
			Buffer.from(JSON.stringify(event)),
			{
				contentType: "application/json",
				persistent: true,
				type: event.type as EventType,
			},
		);
	}

	public async close(): Promise<void> {
		await this.channel?.close();
		await this.connection?.close();
		this.channel = null;
		this.connection = null;
	}
}
