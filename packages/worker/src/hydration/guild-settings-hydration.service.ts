import { Injectable, Logger } from "@nestjs/common";

import { RedisCacheService } from "../redis/cache.service";

interface GuildSettingsSnapshotGuild {
	guildId: string;
	isRankingEnabled: boolean;
	prefix: string | null;
}

interface GuildSettingsSnapshotResponse {
	guilds: GuildSettingsSnapshotGuild[];
}

type JsonRecord = Record<string, unknown>;

const SNAPSHOT_PATH = "/internal/guild-settings/cache-snapshot";
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_RETRY_DELAY_MS = 1000;

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null;

const parsePositiveInteger = (
	value: string | undefined,
	fallback: number,
): number => {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);

	if (Number.isNaN(parsed) || parsed < 1) {
		return fallback;
	}

	return parsed;
};

const sleep = async (delayMs: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, delayMs);
	});

const parseGuildSettingsSnapshot = (
	value: unknown,
): GuildSettingsSnapshotResponse => {
	if (!isRecord(value) || !Array.isArray(value.guilds)) {
		throw new Error("Invalid guild settings snapshot payload");
	}

	return {
		guilds: value.guilds.map((guild): GuildSettingsSnapshotGuild => {
			if (
				!isRecord(guild) ||
				typeof guild.guildId !== "string" ||
				typeof guild.isRankingEnabled !== "boolean" ||
				(guild.prefix !== null && typeof guild.prefix !== "string")
			) {
				throw new Error("Invalid guild settings snapshot guild payload");
			}

			return {
				guildId: guild.guildId,
				isRankingEnabled: guild.isRankingEnabled,
				prefix: guild.prefix,
			};
		}),
	};
};

@Injectable()
export class GuildSettingsHydrationService {
	private readonly logger = new Logger(GuildSettingsHydrationService.name);

	public constructor(private readonly redisCacheService: RedisCacheService) {}

	public async hydrate(): Promise<void> {
		const baseUrl = process.env.INTERNAL_API_BASE_URL;
		const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN;

		if (!baseUrl || !internalServiceToken) {
			this.logger.warn(
				"Skipping worker guild settings hydration because INTERNAL_API_BASE_URL or INTERNAL_SERVICE_TOKEN is missing",
			);
			return;
		}

		this.logger.log("Starting worker guild settings hydration");
		const maxAttempts = parsePositiveInteger(
			process.env.GUILD_SETTINGS_HYDRATION_MAX_ATTEMPTS,
			DEFAULT_MAX_ATTEMPTS,
		);
		const retryDelayMs = parsePositiveInteger(
			process.env.GUILD_SETTINGS_HYDRATION_RETRY_DELAY_MS,
			DEFAULT_RETRY_DELAY_MS,
		);

		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			try {
				const response = await fetch(new URL(SNAPSHOT_PATH, baseUrl), {
					headers: {
						"X-Internal-Service-Token": internalServiceToken,
					},
				});

				if (!response.ok) {
					throw new Error(
						`Guild settings snapshot request failed with status ${response.status}`,
					);
				}

				const snapshot = parseGuildSettingsSnapshot(await response.json());
				await this.redisCacheService.clearGuildSettingsCache();

				let hydratedGuilds = 0;

				for (const guild of snapshot.guilds) {
					if (guild.prefix !== null) {
						await this.redisCacheService.setPrefix(guild.guildId, guild.prefix);
					}

					if (guild.isRankingEnabled) {
						await this.redisCacheService.setRankingEnabled(guild.guildId);
					}

					hydratedGuilds += 1;
				}

				this.logger.log(
					`Hydrated worker guild settings cache guilds=${hydratedGuilds}`,
				);
				return;
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);

				if (attempt === maxAttempts) {
					this.logger.error(
						`Failed to hydrate worker guild settings cache: ${message}`,
					);
					return;
				}

				this.logger.warn(
					`Worker guild settings hydration attempt ${attempt}/${maxAttempts} failed: ${message}. Retrying in ${retryDelayMs}ms`,
				);
				await sleep(retryDelayMs);
			}
		}
	}
}
