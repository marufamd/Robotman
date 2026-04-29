import {
	type ClientOptions,
	type MicroserviceOptions,
	Transport,
} from "@nestjs/microservices";

const DEFAULT_RABBITMQ_HOST = "127.0.0.1";
const DEFAULT_RABBITMQ_PORT = "5672";
const DEFAULT_RABBITMQ_USERNAME = "admin";
const DEFAULT_RABBITMQ_PASSWORD = "password";
const DEFAULT_RABBITMQ_VHOST = "/";
const DEFAULT_WORKER_QUEUE = "worker.queue";
const DEFAULT_EXCHANGE = "robotman.events";

export const buildRabbitMqUrl = (): string => {
	if (process.env.RABBITMQ_URL) {
		return process.env.RABBITMQ_URL;
	}

	const host = process.env.RABBITMQ_HOST ?? DEFAULT_RABBITMQ_HOST;
	const port = process.env.RABBITMQ_PORT ?? DEFAULT_RABBITMQ_PORT;
	const username = process.env.RABBITMQ_DEFAULT_USER ?? DEFAULT_RABBITMQ_USERNAME;
	const password = process.env.RABBITMQ_DEFAULT_PASS ?? DEFAULT_RABBITMQ_PASSWORD;
	const vhost = process.env.RABBITMQ_VHOST ?? DEFAULT_RABBITMQ_VHOST;
	const normalizedVhost = vhost === "/" ? "%2f" : encodeURIComponent(vhost);

	return `amqp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${normalizedVhost}`;
};

const createWorkerRabbitMqTransportOptions = () => ({
	urls: [buildRabbitMqUrl()],
	queue: process.env.WORKER_QUEUE ?? DEFAULT_WORKER_QUEUE,
	queueOptions: {
		durable: true,
	},
	noAck: true,
	prefetchCount: 1,
	wildcards: true,
	exchange: process.env.RABBITMQ_EXCHANGE ?? DEFAULT_EXCHANGE,
	exchangeType: "topic" as const,
	// Broad binding for initial worker bootstrap. Narrow once feature handlers land.
	routingKey: process.env.WORKER_ROUTING_KEY ?? "#",
});

export const createMicroserviceOptions = (): MicroserviceOptions => ({
	transport: Transport.RMQ,
	options: createWorkerRabbitMqTransportOptions(),
});

export const createRabbitMqClientOptions = (): ClientOptions => ({
	transport: Transport.RMQ,
	options: createWorkerRabbitMqTransportOptions(),
});
