import { REST } from "@discordjs/rest";

import { DiscordGatewayService } from "./discord-gateway-service";
import { RabbitMqPublisher } from "./rabbitmq-publisher";

const discordToken = process.env.DISCORD_TOKEN;
const rabbitMqUrl = process.env.RABBITMQ_URL;

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

const service = new DiscordGatewayService({
	publisher,
	rest,
	token: discordToken,
});

void service.start();
