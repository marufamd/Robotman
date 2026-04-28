import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	GatewayIntentBits,
	Routes,
	type GatewayInteractionCreateDispatchData,
	type GatewayMessageCreateDispatchData,
	type RESTGetAPIGatewayBotResult,
} from "discord-api-types/v10";

import { createDiscordInteractionEvent, createDiscordMessageEvent } from "./discord-event-mappers";
import type { RobotmanPublisher } from "./rabbitmq-publisher";

export interface DiscordGatewayManager {
	on(
		event: GatewayDispatchEvents,
		listener: (data: unknown, shardId: number) => void,
	): this;
	connect(): Promise<void>;
}

export interface DiscordRestClient {
	get(route: string): Promise<unknown>;
}

export interface DiscordGatewayManagerConfig {
	intents: GatewayIntentBits | number;
	rest: REST;
	shardCount: number;
	token: string;
}

export interface DiscordGatewayManagerFactory {
	create(config: DiscordGatewayManagerConfig): DiscordGatewayManager;
}

export interface GatewayServiceOptions {
	intents?: GatewayIntentBits | number;
	publisher: RobotmanPublisher;
	rest: DiscordRestClient;
	shardCount?: number;
	token: string;
	websocketManagerFactory?: DiscordGatewayManagerFactory;
}

export class DefaultDiscordGatewayManagerFactory implements DiscordGatewayManagerFactory {
	public create(config: DiscordGatewayManagerConfig): DiscordGatewayManager {
		return new WebSocketManager({
			intents: config.intents,
			rest: config.rest,
			shardCount: config.shardCount,
			token: config.token,
		});
	}
}

export class DiscordGatewayService {
	private manager: DiscordGatewayManager | null = null;

	public constructor(private readonly options: GatewayServiceOptions) {}

	public async start(): Promise<void> {
		await this.options.publisher.connect();

		const gatewayBot = (await this.options.rest.get(
			Routes.gatewayBot(),
		)) as RESTGetAPIGatewayBotResult;
		const shardCount = this.options.shardCount ?? gatewayBot.shards;
		const intents =
			this.options.intents ??
			(GatewayIntentBits.Guilds |
				GatewayIntentBits.GuildMessages |
				GatewayIntentBits.MessageContent);
		const managerFactory =
			this.options.websocketManagerFactory ?? new DefaultDiscordGatewayManagerFactory();

		this.manager = managerFactory.create({
			intents,
			rest: this.options.rest as REST,
			shardCount,
			token: this.options.token,
		});

		this.manager.on(GatewayDispatchEvents.MessageCreate, (data) => {
			void this.options.publisher.publish(
				createDiscordMessageEvent(data as GatewayMessageCreateDispatchData),
			);
		});

		this.manager.on(GatewayDispatchEvents.InteractionCreate, (data) => {
			void this.options.publisher.publish(
				createDiscordInteractionEvent(data as GatewayInteractionCreateDispatchData),
			);
		});

		await this.manager.connect();
	}

	public async stop(): Promise<void> {
		await this.options.publisher.close();
	}
}
