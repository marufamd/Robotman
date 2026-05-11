import { Injectable } from "@nestjs/common";
import type { DiscordMessagePayload, RobotmanEvent } from "@robotman/shared";

import { RedisCacheService } from "../redis/cache.service";
import {
	type LeaderboardRow,
	type RankedUserRow,
	RankingRepository,
} from "./ranking.repository";

const DEFAULT_PREFIX = "=";
const MIN_XP = 10;
const MAX_XP = 20;

@Injectable()
export class RankingService {
	public constructor(
		private readonly rankingRepository: RankingRepository,
		private readonly redisCacheService: RedisCacheService,
	) {}

	public async trackMessage(
		event: RobotmanEvent<DiscordMessagePayload>,
	): Promise<void> {
		const { payload } = event;

		if (
			!payload.guildId ||
			payload.isBot ||
			payload.isSystem ||
			payload.webhookId !== null
		) {
			return;
		}

		if (!(await this.redisCacheService.isRankingEnabled(payload.guildId))) {
			return;
		}

		if (Number.isNaN(Date.parse(payload.timestamp))) {
			return;
		}

		await this.rankingRepository.recordMessage({
			displayName: this.normalizeDisplayName(
				payload.memberDisplayName || payload.userId,
			),
			guildId: payload.guildId,
			timestamp: payload.timestamp,
			userId: payload.userId,
			xp: this.randomXp(),
		});
	}

	public async isRankingEnabled(guildId: string): Promise<boolean> {
		if (!guildId) {
			return false;
		}

		return this.redisCacheService.isRankingEnabled(guildId);
	}

	public async getLeaderboardPage(input: {
		guildId: string;
		page: number;
	}): Promise<LeaderboardRow[]> {
		const normalizedPage = this.normalizePage(input.page);

		return this.rankingRepository.getLeaderboardPage({
			guildId: input.guildId,
			limit: 10,
			offset: (normalizedPage - 1) * 10,
		});
	}

	public async getRankedUser(input: {
		guildId: string;
		userId: string;
	}): Promise<RankedUserRow | null> {
		return this.rankingRepository.getRankedUser(input);
	}

	public async setColor(input: {
		color: number;
		displayName: string;
		guildId: string;
		userId: string;
	}): Promise<void> {
		await this.rankingRepository.upsertColor({
			color: input.color,
			displayName: this.normalizeDisplayName(input.displayName),
			guildId: input.guildId,
			userId: input.userId,
		});
	}

	public async getPrefixForGuild(guildId: string): Promise<string> {
		return (
			(await this.redisCacheService.getPrefix(guildId)) ??
			process.env.DISCORD_PREFIX ??
			DEFAULT_PREFIX
		);
	}

	public normalizePage(page: number): number {
		return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
	}

	private normalizeDisplayName(displayName: string): string {
		return displayName.trim().slice(0, 100);
	}

	private randomXp(): number {
		return Math.floor(Math.random() * (MAX_XP - MIN_XP + 1)) + MIN_XP;
	}
}
