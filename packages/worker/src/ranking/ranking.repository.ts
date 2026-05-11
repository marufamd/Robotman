import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";

import { POSTGRES_POOL } from "../database/database.constants";

export interface RecordRankMessageInput {
	displayName: string;
	guildId: string;
	timestamp: string;
	userId: string;
	xp: number;
}

export interface LeaderboardRow {
	color: number | null;
	displayName: string;
	score: number;
	userId: string;
}

export interface RankedUserRow extends LeaderboardRow {
	position: number;
}

@Injectable()
export class RankingRepository {
	public constructor(
		@Inject(POSTGRES_POOL) private readonly pool: Pool,
	) {}

	public async recordMessage(input: RecordRankMessageInput): Promise<void> {
		await this.pool.query(
			`
				INSERT INTO ranks (guild, user_id, display_name, score, last_message_at)
				VALUES ($1, $2, $3, $4, $5::timestamptz)
				ON CONFLICT (guild, user_id) DO UPDATE
				SET
					display_name = EXCLUDED.display_name,
					score = CASE
						WHEN ranks.last_message_at IS NULL
							OR EXCLUDED.last_message_at - ranks.last_message_at > INTERVAL '2 minutes'
						THEN ranks.score + EXCLUDED.score
						ELSE ranks.score
					END,
					last_message_at = CASE
						WHEN ranks.last_message_at IS NULL
							OR EXCLUDED.last_message_at - ranks.last_message_at > INTERVAL '2 minutes'
						THEN EXCLUDED.last_message_at
						ELSE ranks.last_message_at
					END
			`,
			[
				input.guildId,
				input.userId,
				input.displayName,
				input.xp,
				input.timestamp,
			],
		);
	}

	public async upsertColor(input: {
		color: number;
		displayName: string;
		guildId: string;
		userId: string;
	}): Promise<void> {
		await this.pool.query(
			`
				INSERT INTO ranks (guild, user_id, display_name, score, color)
				VALUES ($1, $2, $3, 0, $4)
				ON CONFLICT (guild, user_id) DO UPDATE
				SET
					color = EXCLUDED.color,
					display_name = EXCLUDED.display_name
			`,
			[input.guildId, input.userId, input.displayName, input.color],
		);
	}

	public async getLeaderboardPage(input: {
		guildId: string;
		limit: number;
		offset: number;
	}): Promise<LeaderboardRow[]> {
		const result = await this.pool.query<LeaderboardRow>(
			`
				SELECT
					color,
					display_name AS "displayName",
					score,
					user_id AS "userId"
				FROM ranks
				WHERE guild = $1
				ORDER BY score DESC, user_id ASC
				LIMIT $2 OFFSET $3
			`,
			[input.guildId, input.limit, input.offset],
		);

		return result.rows;
	}

	public async getRankedUser(input: {
		guildId: string;
		userId: string;
	}): Promise<RankedUserRow | null> {
		const result = await this.pool.query<RankedUserRow>(
			`
				SELECT
					color,
					display_name AS "displayName",
					position,
					score,
					user_id AS "userId"
				FROM (
					SELECT
						color,
						display_name,
						row_number() OVER (ORDER BY score DESC, user_id ASC) AS position,
						score,
						user_id
					FROM ranks
					WHERE guild = $1
				) ranked
				WHERE user_id = $2
			`,
			[input.guildId, input.userId],
		);

		return result.rows[0] ?? null;
	}
}
