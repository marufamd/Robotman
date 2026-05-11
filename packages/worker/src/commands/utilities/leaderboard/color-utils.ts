import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const LEADERBOARD_DEFAULT_ROW_COLOR = 4_803_666;
export const ROBOTMAN_DEFAULT_EMBED_COLOR = 15_905_081;
export const WHITE = 0xffffff;

let cachedNamedColors: Record<string, number> | null = null;

const resolveAssetPath = (...segments: string[]): string => {
	const candidates = [
		resolve(process.cwd(), "assets", ...segments),
		resolve(__dirname, "../../../../assets", ...segments),
		resolve(__dirname, "../../../../../assets", ...segments),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return join(process.cwd(), "assets", ...segments);
};

const getNamedColors = (): Record<string, number> => {
	if (cachedNamedColors) {
		return cachedNamedColors;
	}

	cachedNamedColors = JSON.parse(
		readFileSync(resolveAssetPath("colors.json"), "utf8"),
	) as Record<string, number>;

	return cachedNamedColors;
};

const parseRgb = (value: string): number =>
	Number.parseInt(value.replace(/,/g, "").replace(/[()]/g, ""), 10);

const resolveColor = (input: unknown): number | null => {
	let resolved: number;

	if (typeof input === "string") {
		if (input === "RANDOM") {
			return Math.floor(Math.random() * (0xffffff + 1));
		}

		if (input === "DEFAULT") {
			return 0;
		}

		const namedColors = getNamedColors();

		if (input in namedColors) {
			return namedColors[input];
		}

		const hex = formatHexColor(input, true);

		if (!/^#[0-9A-F]{6}$/i.test(hex)) {
			return null;
		}

		resolved = Number.parseInt(input, 16);
	} else if (typeof input === "number") {
		resolved = input;
	} else if (Array.isArray(input)) {
		resolved = (input[0] << 16) + (input[1] << 8) + input[2];
	} else {
		return null;
	}

	if (resolved < 0 || resolved > 0xffffff || !Number.isInteger(resolved)) {
		return null;
	}

	return resolved;
};

export const parseLeaderboardColorArgument = (value: string): number | null => {
	let resolved: number | string | number[];
	const normalized = value.toUpperCase();
	const split = normalized.split(/ +/);

	if (split.length === 3 && !Number.isNaN(parseRgb(split[0]))) {
		resolved = split.map((entry) => parseRgb(entry));
	} else {
		const compact = normalized.replaceAll(/ +/g, "_").replaceAll("#", "");

		resolved =
			compact.length !== 6 && !Number.isNaN(Number.parseInt(compact))
				? Number.parseInt(compact)
				: compact;
	}

	return resolveColor(resolved);
};

export const formatHexColor = (
	color: number | string,
	prefix = true,
): string => {
	const normalized =
		typeof color === "number" ? color.toString(16) : color.toString();
	const formatted = normalized.padStart(6, "0").toUpperCase();

	return prefix ? `#${formatted}` : formatted;
};

export const trimText = (value: string, max: number): string =>
	value.length > max ? `${value.slice(0, max - 3).trimEnd()}...` : value;

export { resolveAssetPath };
