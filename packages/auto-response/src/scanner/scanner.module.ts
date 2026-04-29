import { Module } from "@nestjs/common";
import { ClientProxyFactory } from "@nestjs/microservices";

import { RedisModule } from "../redis/redis.module";
import { createRabbitMqClientOptions } from "../rabbitmq/rabbitmq.options";
import { AUTO_RESPONSE_RABBITMQ_CLIENT } from "./scanner.constants";
import { ScannerController } from "./scanner.controller";
import { ScannerService } from "./scanner.service";

@Module({
	imports: [RedisModule],
	controllers: [ScannerController],
	providers: [
		ScannerService,
		{
			provide: AUTO_RESPONSE_RABBITMQ_CLIENT,
			useFactory: () => ClientProxyFactory.create(createRabbitMqClientOptions()),
		},
	],
})
export class ScannerModule {}
