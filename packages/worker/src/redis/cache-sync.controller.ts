import { Controller } from "@nestjs/common";
import {
	EventType,
	type DashboardSettingsUpdatedPayload,
	type RobotmanEvent,
} from "@robotman/shared";
import {
	Ctx,
	EventPattern,
	Payload,
	type RmqContext,
} from "@nestjs/microservices";

import { CacheService } from "./cache.service";

@Controller()
export class CacheSyncController {
	public constructor(private readonly cacheService: CacheService) {}

	@EventPattern(EventType.DASHBOARD_SETTINGS_UPDATED)
	public async syncGuildPrefix(
		@Payload() event: RobotmanEvent<DashboardSettingsUpdatedPayload>,
		@Ctx() _context: RmqContext,
	): Promise<void> {
		const { guildId, prefix } = event.payload;

		if (prefix === null) {
			await this.cacheService.deletePrefix(guildId);
			return;
		}

		await this.cacheService.setPrefix(guildId, prefix);
	}
}
