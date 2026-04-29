import { Controller } from "@nestjs/common";
import {
	EventType,
	type DashboardResponseUpdatedPayload,
	type RobotmanEvent,
} from "@robotman/shared";
import {
	Ctx,
	EventPattern,
	Payload,
	type RmqContext,
} from "@nestjs/microservices";

import { CacheService, type CachedTrigger } from "./cache.service";

const mapPayloadToCachedTrigger = (
	responseId: string,
	data: NonNullable<DashboardResponseUpdatedPayload["data"]>,
): CachedTrigger => ({
	content: data.content,
	patterns: [data.name, ...data.aliases],
	responseId,
	wildcard: data.wildcard,
});

@Controller()
export class CacheSyncController {
	public constructor(private readonly cacheService: CacheService) {}

	@EventPattern(EventType.DASHBOARD_RESPONSE_UPDATED)
	public async syncGuildTriggers(
		@Payload() event: RobotmanEvent<DashboardResponseUpdatedPayload>,
		@Ctx() _context: RmqContext,
	): Promise<void> {
		const { action, data, guildId, responseId } = event.payload;
		const cachedTriggers = (await this.cacheService.getTriggers(guildId)) ?? [];

		if (action === "DELETE") {
			const nextTriggers = cachedTriggers.filter(
				(trigger) => trigger.responseId !== responseId,
			);

			if (nextTriggers.length === 0) {
				await this.cacheService.deleteTriggers(guildId);
				return;
			}

			await this.cacheService.setTriggers(guildId, nextTriggers);
			return;
		}

		if (!data) {
			return;
		}

		const nextTrigger = mapPayloadToCachedTrigger(responseId, data);
		const nextTriggers = cachedTriggers.filter(
			(trigger) => trigger.responseId !== responseId,
		);

		nextTriggers.push(nextTrigger);
		await this.cacheService.setTriggers(guildId, nextTriggers);
	}
}
