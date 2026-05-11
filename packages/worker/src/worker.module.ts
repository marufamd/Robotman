import { Module } from "@nestjs/common";

import { CommandsModule } from "./commands/commands.module";
import { HealthModule } from "./health/health.module";
import { HydrationModule } from "./hydration/hydration.module";
import { RedisModule } from "./redis/redis.module";

@Module({
	imports: [HealthModule, RedisModule, HydrationModule, CommandsModule],
})
export class WorkerModule {}
