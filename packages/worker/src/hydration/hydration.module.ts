import { Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module";
import { GuildSettingsHydrationService } from "./guild-settings-hydration.service";

@Module({
	imports: [RedisModule],
	providers: [GuildSettingsHydrationService],
	exports: [GuildSettingsHydrationService],
})
export class HydrationModule {}
