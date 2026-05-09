import { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	GatewayIntentBits,
	Routes,
	type GatewayDispatchPayload,
	type GatewayInteractionCreateDispatchData,
	type GatewayMessageCreateDispatchData,
	type RESTGetAPIGatewayBotResult,
} from "discord-api-types/v10";

import { createDiscordInteractionEvent, createDiscordMessageEvent } from "./discord-event-mappers";
import type { RobotmanPublisher } from "./rabbitmq-publisher";

export interface DiscordGatewayManager {
	on(
		event: WebSocketShardEvents,
		listener: (payload: { data: GatewayDispatchPayload; shardId: number }) => void,
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
	logger?: Pick<typeof console, "error" | "info">;
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
	private readonly logger: Pick<typeof console, "error" | "info">;

	public constructor(private readonly options: GatewayServiceOptions) {
		this.logger = options.logger ?? console;
	}

	public async start(): Promise<void> {
		this.logger.info("Gateway: connecting publisher");
		await this.options.publisher.connect();
		this.logger.info("Gateway: publisher connected");

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
		this.logger.info(`Gateway: websocket manager created with ${shardCount} shard(s)`);

		this.manager.on(WebSocketShardEvents.Dispatch, ({ data }) => {
			if (data.t !== GatewayDispatchEvents.MessageCreate) {
				return;
			}

			const event = createDiscordMessageEvent(
				data.d as GatewayMessageCreateDispatchData,
			);
			this.logger.info(
				`Gateway: received message create in guild ${event.payload.guildId} channel ${event.payload.channelId}`,
			);
			void this.options.publisher.publish(event).catch((error: unknown) => {
				this.logger.error("Gateway: failed to publish message create event", error);
			});
		});

		this.manager.on(WebSocketShardEvents.Dispatch, ({ data }) => {
			if (data.t !== GatewayDispatchEvents.InteractionCreate) {
				return;
			}

			const event = createDiscordInteractionEvent(
				data.d as GatewayInteractionCreateDispatchData,
			);
			this.logger.info(
				`Gateway: received interaction create ${event.payload.commandName} in guild ${event.payload.guildId}`,
			);
			void this.options.publisher.publish(event).catch((error: unknown) => {
				this.logger.error("Gateway: failed to publish interaction create event", error);
			});
		});

		this.logger.info("Gateway: connecting to Discord gateway");
		await this.manager.connect();
		this.logger.info("Gateway: Discord gateway connected");
	}

	public async stop(): Promise<void> {
		await this.options.publisher.close();
	}
}
