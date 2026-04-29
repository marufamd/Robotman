import { Module } from "@nestjs/common";

import { CommandsModule } from "./commands/commands.module";
import { HealthModule } from "./health/health.module";
import { RedisModule } from "./redis/redis.module";

@Module({
	imports: [HealthModule, RedisModule, CommandsModule],
})
export class WorkerModule {}
