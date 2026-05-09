import { Buffer } from "node:buffer";

import { connect, type ConsumeMessage, type Options } from "amqplib";

import type {
	OutboundInteractionReplyPayload,
	OutboundMessagePayload,
	RobotmanEvent,
} from "@robotman/shared";

export interface RabbitMqConsumerChannel {
	assertExchange(
		exchange: string,
		type: "topic",
		options?: Options.AssertExchange,
	): Promise<unknown>;
	assertQueue(
		queue: string,
		options?: Options.AssertQueue,
	): Promise<unknown>;
	bindQueue(queue: string, exchange: string, routingKey: string): Promise<unknown>;
	consume(
		queue: string,
		onMessage: (message: ConsumeMessage | null) => void | Promise<void>,
		options?: Options.Consume,
	): Promise<unknown>;
	ack(message: ConsumeMessage): void;
	nack(message: ConsumeMessage, allUpTo?: boolean, requeue?: boolean): void;
	close(): Promise<void>;
}

export interface RabbitMqConsumerConnection {
	createChannel(): Promise<RabbitMqConsumerChannel>;
	close(): Promise<void>;
}

export type RabbitMqConsumerConnector = (
	url: string,
) => Promise<RabbitMqConsumerConnection>;

export interface GatewayOutboundEventHandler {
	handleEvent(
		event:
			| RobotmanEvent<OutboundMessagePayload>
			| RobotmanEvent<OutboundInteractionReplyPayload>,
	): Promise<void>;
}

export interface RabbitMqConsumerOptions {
	connectionUrl: string;
	connector?: RabbitMqConsumerConnector;
	eventHandler: GatewayOutboundEventHandler;
	exchange: string;
	logger?: Pick<typeof console, "error" | "info">;
	queue: string;
	routingKeys: readonly string[];
}

type OutboundGatewayEvent =
	| RobotmanEvent<OutboundMessagePayload>
	| RobotmanEvent<OutboundInteractionReplyPayload>;

interface NestEventPacket<T> {
	data: T;
	pattern?: string;
}

export class RabbitMqConsumer {
	private connection: RabbitMqConsumerConnection | null = null;
	private channel: RabbitMqConsumerChannel | null = null;
	private readonly logger: Pick<typeof console, "error" | "info">;

	public constructor(private readonly options: RabbitMqConsumerOptions) {
		this.logger = options.logger ?? console;
	}

	public async start(): Promise<void> {
		if (this.channel) {
			return;
		}

		const connector = this.options.connector ?? connect;
		this.logger.info("Gateway: connecting outbound consumer");
		this.connection = await connector(this.options.connectionUrl);
		this.channel = await this.connection.createChannel();
		await this.channel.assertExchange(this.options.exchange, "topic", {
			durable: true,
		});
		await this.channel.assertQueue(this.options.queue, { durable: true });

		for (const routingKey of this.options.routingKeys) {
			await this.channel.bindQueue(
				this.options.queue,
				this.options.exchange,
				routingKey,
			);
		}

		await this.channel.consume(
			this.options.queue,
			async (message) => this.handleMessage(message),
			{ noAck: false },
		);
		this.logger.info(
			`Gateway: outbound consumer listening on ${this.options.queue}`,
		);
	}

	public async stop(): Promise<void> {
		await this.channel?.close();
		await this.connection?.close();
		this.channel = null;
		this.connection = null;
	}

	private async handleMessage(message: ConsumeMessage | null): Promise<void> {
		if (!message || !this.channel) {
			return;
		}

		try {
			const packet = JSON.parse(
				Buffer.from(message.content).toString("utf8"),
			) as NestEventPacket<OutboundGatewayEvent> | OutboundGatewayEvent;
			const event =
				packet && typeof packet === "object" && "data" in packet
					? packet.data
					: packet;
			await this.options.eventHandler.handleEvent(event as OutboundGatewayEvent);
			this.channel.ack(message);
		} catch (error: unknown) {
			this.logger.error("Gateway: failed to process outbound message", error);
			this.channel.nack(message, false, false);
		}
	}
}
