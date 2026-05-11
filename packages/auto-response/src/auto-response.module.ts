import { Module } from "@nestjs/common";

import { TriggerHydrationService } from "./hydration/trigger-hydration.service";
import { RedisModule } from "./redis/redis.module";
import { ScannerModule } from "./scanner/scanner.module";

@Module({
	imports: [RedisModule, ScannerModule],
	providers: [TriggerHydrationService],
	exports: [TriggerHydrationService],
})
export class AutoResponseModule {}
