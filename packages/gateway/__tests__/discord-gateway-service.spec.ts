import { WebSocketShardEvents } from "@discordjs/ws";
import {
	GatewayDispatchEvents,
	type GatewayInteractionCreateDispatchData,
	GatewayIntentBits,
	type GatewayMessageCreateDispatchData,
	Routes,
	type GatewayDispatchPayload,
} from "discord-api-types/v10";

import { EventType } from "@robotman/shared";
import {
	type DiscordGatewayManager,
	DiscordGatewayService,
	type DiscordRestClient,
} from "../src/discord-gateway-service";
import type { RobotmanPublisher } from "../src/rabbitmq-publisher";

class MockDiscordGatewayManager implements DiscordGatewayManager {
	public readonly listeners = new Map<
		WebSocketShardEvents,
		Array<(payload: { data: GatewayDispatchPayload; shardId: number }) => void>
	>();

	public connect = jest.fn(async () => undefined);

	public on(
		event: WebSocketShardEvents,
		listener: (payload: { data: GatewayDispatchPayload; shardId: number }) => void,
	): this {
		const listeners = this.listeners.get(event) ?? [];
		listeners.push(listener);
		this.listeners.set(event, listeners);
		return this;
	}
}

describe("DiscordGatewayService", () => {
	it("publishes MESSAGE_CREATE events to RabbitMQ in the shared envelope", async () => {
		const manager = new MockDiscordGatewayManager();
		const websocketManagerFactory = {
			create: jest.fn(() => manager),
		};
		const publisher: RobotmanPublisher = {
			close: jest.fn(async () => undefined),
			connect: jest.fn(async () => undefined),
			publish: jest.fn(async () => undefined),
		};
		const rest: DiscordRestClient = {
			get: jest.fn(async (route: string) => {
				expect(route).toBe(Routes.gatewayBot());
				return { shards: 2, url: "wss://gateway.discord.gg" };
			}),
		};

		const service = new DiscordGatewayService({
			publisher,
			rest,
			token: "discord-token",
			websocketManagerFactory,
		});

		await service.start();

		const listeners = manager.listeners.get(WebSocketShardEvents.Dispatch);
		expect(listeners).toBeDefined();

		for (const listener of listeners ?? []) {
			listener(
			{
				data: {
					d: {
						author: {
							avatar: null,
							bot: false,
							discriminator: "0",
							global_name: "Robotman",
							id: "user-1",
							username: "robotman",
						},
						channel_id: "channel-1",
						content: "hello world",
						guild_id: "guild-1",
						id: "message-1",
					} as GatewayMessageCreateDispatchData,
					op: 0,
					s: 1,
					t: GatewayDispatchEvents.MessageCreate,
				},
				shardId: 0,
			},
			);
		}

		expect(publisher.connect).toHaveBeenCalledTimes(1);
		expect(manager.connect).toHaveBeenCalledTimes(1);
		expect(websocketManagerFactory.create).toHaveBeenCalledWith(
			expect.objectContaining({
				intents:
					GatewayIntentBits.Guilds |
					GatewayIntentBits.GuildMessages |
					GatewayIntentBits.MessageContent,
				shardCount: 2,
				token: "discord-token",
			}),
		);
		expect(publisher.publish).toHaveBeenCalledTimes(1);
		expect(publisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: EventType.DISCORD_MESSAGE,
				payload: {
					channelId: "channel-1",
					content: "hello world",
					guildId: "guild-1",
					isBot: false,
					messageId: "message-1",
					userId: "user-1",
				},
			}),
		);
	});

	it("publishes INTERACTION_CREATE events to RabbitMQ in the shared envelope", async () => {
		const manager = new MockDiscordGatewayManager();
		const websocketManagerFactory = {
			create: jest.fn(() => manager),
		};
		const publisher: RobotmanPublisher = {
			close: jest.fn(async () => undefined),
			connect: jest.fn(async () => undefined),
			publish: jest.fn(async () => undefined),
		};
		const rest: DiscordRestClient = {
			get: jest.fn(async () => ({ shards: 1, url: "wss://gateway.discord.gg" })),
		};

		const service = new DiscordGatewayService({
			intents: GatewayIntentBits.Guilds,
			publisher,
			rest,
			token: "discord-token",
			websocketManagerFactory,
		});

		await service.start();

		const listeners = manager.listeners.get(WebSocketShardEvents.Dispatch);
		expect(listeners).toBeDefined();

		for (const listener of listeners ?? []) {
			listener(
			{
				data: {
					d: {
						channel_id: "channel-9",
						data: {
							id: "command-1",
							name: "ping",
							options: [
								{
									name: "target",
									type: 3,
									value: "robotman",
								},
							],
							type: 1,
						},
						guild_id: "guild-9",
						id: "interaction-9",
						member: {
							user: {
								avatar: null,
								discriminator: "0",
								global_name: "Robotman",
								id: "user-9",
								username: "robotman",
							},
						},
						token: "interaction-token",
						type: 2,
					} as GatewayInteractionCreateDispatchData,
					op: 0,
					s: 1,
					t: GatewayDispatchEvents.InteractionCreate,
				},
				shardId: 0,
			},
			);
		}

		expect(publisher.publish).toHaveBeenCalledWith(
			expect.objectContaining({
				type: EventType.DISCORD_INTERACTION,
				payload: {
					channelId: "channel-9",
					commandName: "ping",
					guildId: "guild-9",
					interactionId: "interaction-9",
					interactionToken: "interaction-token",
					options: {
						target: "robotman",
					},
					userId: "user-9",
				},
			}),
		);
	});
});
