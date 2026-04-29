import "reflect-metadata";

import { bootstrap } from "./main";

void bootstrap();

export { bootstrap } from "./main";
export {
	buildRabbitMqUrl,
	createMicroserviceOptions,
	createRabbitMqClientOptions,
} from "./rabbitmq/rabbitmq.options";
export { WorkerModule } from "./worker.module";
export { CommandParserModule } from "./command-parser/command-parser.module";
export {
	CommandParserService,
	type ParsedCommand,
} from "./command-parser/command-parser.service";
export { CommandsModule } from "./commands/commands.module";
export { UtilitiesCommandsModule } from "./commands/utilities/utilities-commands.module";
export { WORKER_RABBITMQ_CLIENT } from "./commands/utilities/ping/ping.constants";
export { PingInteractionController } from "./commands/utilities/ping/ping-interaction.controller";
export { PingMessageController } from "./commands/utilities/ping/ping-message.controller";
export { PingModule } from "./commands/utilities/ping/ping.module";
export {
	PingService,
	type PingCommandResult,
} from "./commands/utilities/ping/ping.service";
export {
	HealthController,
	HEALTH_PING_PATTERN,
	type HealthPingResponse,
} from "./health/health.controller";
export { HealthModule } from "./health/health.module";
export {
	CacheSyncController,
} from "./redis/cache-sync.controller";
export {
	buildGuildPrefixCacheKey,
	CacheService,
	RedisCacheService,
	type RedisKeyValueStore,
} from "./redis/cache.service";
export { REDIS_CLIENT } from "./redis/redis.constants";
export { RedisModule } from "./redis/redis.module";
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
