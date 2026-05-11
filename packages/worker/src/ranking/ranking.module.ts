import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { RedisModule } from "../redis/redis.module";
import { RankingRepository } from "./ranking.repository";
import { RankingService } from "./ranking.service";

@Module({
	imports: [DatabaseModule, RedisModule],
	providers: [RankingRepository, RankingService],
	exports: [RankingRepository, RankingService],
})
export class RankingModule {}
