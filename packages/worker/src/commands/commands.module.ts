import { Module } from "@nestjs/common";
import { ClientProxyFactory } from "@nestjs/microservices";

import { CommandParserModule } from "../command-parser/command-parser.module";
import { createRabbitMqClientOptions } from "../rabbitmq/rabbitmq.options";
import { WORKER_RABBITMQ_CLIENT } from "./commands.constants";
import { InteractionCommandController } from "./interaction-command.controller";
import { MessageCommandController } from "./message-command.controller";
import { CommandsRegistryService } from "./commands.registry";
import { UtilitiesCommandsModule } from "./utilities/utilities-commands.module";

@Module({
	imports: [CommandParserModule, UtilitiesCommandsModule],
	controllers: [InteractionCommandController, MessageCommandController],
	providers: [
		CommandsRegistryService,
		{
			provide: WORKER_RABBITMQ_CLIENT,
			useFactory: () => ClientProxyFactory.create(createRabbitMqClientOptions()),
		},
	],
})
export class CommandsModule {}
