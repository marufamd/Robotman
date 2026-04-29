import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { MicroserviceOptions } from "@nestjs/microservices";

import { createMicroserviceOptions } from "./rabbitmq/rabbitmq.options";
import { WorkerModule } from "./worker.module";

export const bootstrap = async (): Promise<void> => {
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(
		WorkerModule,
		createMicroserviceOptions(),
	);

	await app.listen();
};
