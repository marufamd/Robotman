import "reflect-metadata";

import { bootstrap } from "./main";

void bootstrap();

export { bootstrap } from "./main";
export {
	buildRabbitMqUrl,
	createMicroserviceOptions,
	createRabbitMqClientOptions,
} from "./rabbitmq/rabbitmq.options";
export { AutoResponseModule } from "./auto-response.module";
export { CacheSyncController } from "./redis/cache-sync.controller";
export {
	buildGuildTriggerCacheKey,
	CacheService,
	RedisCacheService,
	type CachedTrigger,
	type RedisKeyValueStore,
} from "./redis/cache.service";
export { REDIS_CLIENT } from "./redis/redis.constants";
export { RedisModule } from "./redis/redis.module";
export { AUTO_RESPONSE_RABBITMQ_CLIENT } from "./scanner/scanner.constants";
export { ScannerController } from "./scanner/scanner.controller";
export { ScannerModule } from "./scanner/scanner.module";
export { ScannerService } from "./scanner/scanner.service";
export {
	EventType,
	type DashboardResponseUpdatedPayload,
	type DashboardSettingsUpdatedPayload,
	type DiscordInteractionPayload,
	type DiscordMessagePayload,
	type OutboundInteractionReplyPayload,
	type OutboundMessagePayload,
	type RobotmanEvent,
} from "@robotman/shared";
