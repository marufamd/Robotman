import { Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module";
import { CommandParserService } from "./command-parser.service";

@Module({
	imports: [RedisModule],
	providers: [CommandParserService],
	exports: [CommandParserService],
})
export class CommandParserModule {}
