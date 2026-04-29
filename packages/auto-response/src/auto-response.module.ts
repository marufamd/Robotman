import { Module } from "@nestjs/common";

import { RedisModule } from "./redis/redis.module";
import { ScannerModule } from "./scanner/scanner.module";

@Module({
	imports: [RedisModule, ScannerModule],
})
export class AutoResponseModule {}
