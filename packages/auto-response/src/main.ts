import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { MicroserviceOptions } from "@nestjs/microservices";

import { AutoResponseModule } from "./auto-response.module";
import { createMicroserviceOptions } from "./rabbitmq/rabbitmq.options";

export const bootstrap = async (): Promise<void> => {
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(
		AutoResponseModule,
		createMicroserviceOptions(),
	);

	await app.listen();
};
