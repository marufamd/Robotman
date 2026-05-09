import { REST } from "@discordjs/rest";
import { EventType } from "@robotman/shared";

import { DiscordOutboundService } from "./discord-outbound-service";
import { DiscordGatewayService } from "./discord-gateway-service";
import { RabbitMqConsumer } from "./rabbitmq-consumer";
import { RabbitMqPublisher } from "./rabbitmq-publisher";

const discordToken = process.env.DISCORD_TOKEN;
const rabbitMqUrl = process.env.RABBITMQ_URL;
const gatewayQueue = process.env.GATEWAY_QUEUE ?? "gateway.queue";

if (!discordToken) {
	throw new Error("DISCORD_TOKEN is required");
}

if (!rabbitMqUrl) {
	throw new Error("RABBITMQ_URL is required");
}

const rest = new REST({ version: "10" }).setToken(discordToken);
const publisher = new RabbitMqPublisher({
	connectionUrl: rabbitMqUrl,
	exchange: "robotman.events",
});
const outboundService = new DiscordOutboundService({
	logger: console,
	rest,
});
const consumer = new RabbitMqConsumer({
	connectionUrl: rabbitMqUrl,
	eventHandler: outboundService,
	exchange: "robotman.events",
	logger: console,
	queue: gatewayQueue,
	routingKeys: [
		EventType.DISCORD_OUTBOUND_MESSAGE,
		EventType.DISCORD_OUTBOUND_REPLY,
	],
});

const service = new DiscordGatewayService({
	publisher,
	rest,
	token: discordToken,
});

process.on("unhandledRejection", (error) => {
	console.error("Gateway: unhandled promise rejection", error);
});

process.on("uncaughtException", (error) => {
	console.error("Gateway: uncaught exception", error);
});

console.info("Gateway: starting");

void Promise.all([consumer.start(), service.start()]).catch((error: unknown) => {
	console.error("Gateway: failed to start", error);
	process.exitCode = 1;
});
