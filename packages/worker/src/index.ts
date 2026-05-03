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
export {
	COMMAND_HANDLERS,
	WORKER_RABBITMQ_CLIENT,
} from "./commands/commands.constants";
export { InteractionCommandController } from "./commands/interaction-command.controller";
export { MessageCommandController } from "./commands/message-command.controller";
export { CommandsModule } from "./commands/commands.module";
export { CommandsRegistryService } from "./commands/commands.registry";
export {
	type CommandArgumentDefinition,
	type CommandArgumentDefaultValue,
	type CommandArgumentMatch,
	type CommandArgumentResolutionContext,
	type CommandArgumentResolver,
	type CommandArgumentType,
	type CommandArgumentTypeName,
	type CommandDefinition,
	type PrefixCommandDefinition,
	type PrefixCommandExecutionContext,
	type PrefixCommandExecutionResult,
	type SlashCommandDefinition,
	type SlashCommandExecutionContext,
	type SlashCommandExecutionResult,
	type CommandHandler,
} from "./commands/command-handler";
export { UtilitiesCommandsModule } from "./commands/utilities/utilities-commands.module";
export { PingCommand } from "./commands/utilities/ping/ping.command";
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
