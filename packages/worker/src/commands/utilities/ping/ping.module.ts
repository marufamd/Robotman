import { Module } from "@nestjs/common";
import { ClientProxyFactory } from "@nestjs/microservices";

import { CommandParserModule } from "../../../command-parser/command-parser.module";
import { createRabbitMqClientOptions } from "../../../rabbitmq/rabbitmq.options";
import { WORKER_RABBITMQ_CLIENT } from "./ping.constants";
import { PingInteractionController } from "./ping-interaction.controller";
import { PingMessageController } from "./ping-message.controller";
import { PingService } from "./ping.service";

@Module({
	imports: [CommandParserModule],
	controllers: [PingInteractionController, PingMessageController],
	providers: [
		PingService,
		{
			provide: WORKER_RABBITMQ_CLIENT,
			useFactory: () => ClientProxyFactory.create(createRabbitMqClientOptions()),
		},
	],
})
export class PingModule {}
