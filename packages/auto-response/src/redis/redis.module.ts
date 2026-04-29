import { Module } from "@nestjs/common";
import Redis from "ioredis";

import { CacheSyncController } from "./cache-sync.controller";
import { CacheService } from "./cache.service";
import { REDIS_CLIENT } from "./redis.constants";

const DEFAULT_REDIS_HOST = "127.0.0.1";
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;

const parseInteger = (value: string | undefined, fallback: number): number => {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);

	return Number.isNaN(parsed) ? fallback : parsed;
};

const createRedisClient = (): Redis => {
	if (process.env.REDIS_URL) {
		return new Redis(process.env.REDIS_URL);
	}

	return new Redis({
		db: parseInteger(process.env.REDIS_DB, DEFAULT_REDIS_DB),
		host: process.env.REDIS_HOST ?? DEFAULT_REDIS_HOST,
		password: process.env.REDIS_PASSWORD,
		port: parseInteger(process.env.REDIS_PORT, DEFAULT_REDIS_PORT),
		username: process.env.REDIS_USERNAME,
	});
};

@Module({
	controllers: [CacheSyncController],
	providers: [
		{
			provide: REDIS_CLIENT,
			useFactory: createRedisClient,
		},
		CacheService,
	],
	exports: [CacheService],
})
export class RedisModule {}
