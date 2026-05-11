import { Injectable, Logger } from "@nestjs/common";

import { RedisCacheService, type CachedTrigger } from "../redis/cache.service";

interface TriggerSnapshotItem {
	responseId: string;
	name: string;
	aliases: string[];
	content: string;
	wildcard: boolean;
}

interface TriggerSnapshotGuild {
	guildId: string;
	triggers: TriggerSnapshotItem[];
}

interface TriggerSnapshotResponse {
	guilds: TriggerSnapshotGuild[];
}

type JsonRecord = Record<string, unknown>;

const SNAPSHOT_PATH = "/internal/auto-responses/cache-snapshot";
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_RETRY_DELAY_MS = 1000;

const isRecord = (value: unknown): value is JsonRecord =>
	typeof value === "object" && value !== null;

const isStringArray = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((entry) => typeof entry === "string");

const parseTriggerSnapshot = (value: unknown): TriggerSnapshotResponse => {
	if (!isRecord(value) || !Array.isArray(value.guilds)) {
		throw new Error("Invalid trigger snapshot payload");
	}

	const guilds = value.guilds.map((guild): TriggerSnapshotGuild => {
		if (!isRecord(guild) || typeof guild.guildId !== "string" || !Array.isArray(guild.triggers)) {
			throw new Error("Invalid trigger snapshot guild payload");
		}

		const triggers = guild.triggers.map((trigger): TriggerSnapshotItem => {
			if (
				!isRecord(trigger) ||
				typeof trigger.responseId !== "string" ||
				typeof trigger.name !== "string" ||
				!isStringArray(trigger.aliases) ||
				typeof trigger.content !== "string" ||
				typeof trigger.wildcard !== "boolean"
			) {
				throw new Error("Invalid trigger snapshot item payload");
			}

			return {
				responseId: trigger.responseId,
				name: trigger.name,
				aliases: trigger.aliases,
				content: trigger.content,
				wildcard: trigger.wildcard,
			};
		});

		return {
			guildId: guild.guildId,
			triggers,
		};
	});

	return { guilds };
};

const mapTrigger = (trigger: TriggerSnapshotItem): CachedTrigger => ({
	content: trigger.content,
	patterns: [trigger.name, ...trigger.aliases],
	responseId: trigger.responseId,
	wildcard: trigger.wildcard,
});

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

@Injectable()
export class TriggerHydrationService {
	private readonly logger = new Logger(TriggerHydrationService.name);

	public constructor(private readonly redisCacheService: RedisCacheService) {}

	public async hydrate(): Promise<void> {
		const baseUrl = process.env.INTERNAL_API_BASE_URL;
		const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN;

		if (!baseUrl || !internalServiceToken) {
			this.logger.warn(
				"Skipping auto-response trigger hydration because INTERNAL_API_BASE_URL or INTERNAL_SERVICE_TOKEN is missing",
			);
			return;
		}

		this.logger.log("Starting auto-response trigger hydration");
		const maxAttempts = parsePositiveInteger(
			process.env.TRIGGER_HYDRATION_MAX_ATTEMPTS,
			DEFAULT_MAX_ATTEMPTS,
		);
		const retryDelayMs = parsePositiveInteger(
			process.env.TRIGGER_HYDRATION_RETRY_DELAY_MS,
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
						`Trigger snapshot request failed with status ${response.status}`,
					);
				}

				const snapshot = parseTriggerSnapshot(await response.json());
				let hydratedGuilds = 0;
				let hydratedTriggers = 0;

				for (const guild of snapshot.guilds) {
					if (guild.triggers.length === 0) {
						continue;
					}

					await this.redisCacheService.setTriggers(
						guild.guildId,
						guild.triggers.map(mapTrigger),
					);
					hydratedGuilds += 1;
					hydratedTriggers += guild.triggers.length;
				}

				this.logger.log(
					`Hydrated auto-response trigger cache guilds=${hydratedGuilds} triggers=${hydratedTriggers}`,
				);
				return;
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);

				if (attempt === maxAttempts) {
					this.logger.error(
						`Failed to hydrate auto-response trigger cache: ${message}`,
					);
					return;
				}

				this.logger.warn(
					`Auto-response trigger hydration attempt ${attempt}/${maxAttempts} failed: ${message}. Retrying in ${retryDelayMs}ms`,
				);
				await sleep(retryDelayMs);
			}
		}
	}
}
