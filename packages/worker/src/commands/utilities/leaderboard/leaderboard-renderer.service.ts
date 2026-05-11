import { Injectable } from "@nestjs/common";
import {
	GlobalFonts,
	createCanvas,
	type CanvasRenderingContext2D,
} from "@napi-rs/canvas";

import {
	LEADERBOARD_DEFAULT_ROW_COLOR,
	WHITE,
	formatHexColor,
	resolveAssetPath,
	trimText,
} from "./color-utils";

export interface LeaderboardRenderEntry {
	color: number | null;
	displayName: string;
	rank: number;
	score: number;
}

const CANVAS_HEIGHT = 700;
const CANVAS_WIDTH = 600;
const ENTRY_HEIGHT = 61;
const ENTRY_GAP = 10;
const ENTRY_RADIUS = 8;
const FONT_FAMILY = "ComfortaaBold";
const FONT_SIZE = 23;
const SCORE_SPACE = 116;
const TEXT_X = 30;
const USERNAME_MAX_LENGTH = 30;

let fontsRegistered = false;

const registerFonts = (): void => {
	if (fontsRegistered) {
		return;
	}

	GlobalFonts.registerFromPath(
		resolveAssetPath("fonts", "Comfortaa-Bold.ttf"),
		FONT_FAMILY,
	);
	GlobalFonts.registerFromPath(
		resolveAssetPath("fonts", "NotoSans-Bold.ttf"),
		"NotoSansBold",
	);
	fontsRegistered = true;
};

const fillRoundedRect = (
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void => {
	context.beginPath();
	context.moveTo(x + radius, y);
	context.lineTo(x + width - radius, y);
	context.arcTo(x + width, y, x + width, y + radius, radius);
	context.lineTo(x + width, y + height - radius);
	context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
	context.lineTo(x + radius, y + height);
	context.arcTo(x, y + height, x, y + height - radius, radius);
	context.lineTo(x, y + radius);
	context.arcTo(x, y, x + radius, y, radius);
	context.closePath();
	context.fill();
};

@Injectable()
export class LeaderboardRendererService {
	public async render(entries: readonly LeaderboardRenderEntry[]): Promise<Buffer> {
		registerFonts();

		const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
		const context = canvas.getContext("2d");

		context.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
		context.textBaseline = "alphabetic";

		const rankWidth = context.measureText(
			`#${entries.at(-1)?.rank ?? 10}`,
		).width;
		let y = 0;

		for (const entry of entries) {
			const textY = y + 40;
			const score = entry.score.toString();
			const scoreWidth = context.measureText(score).width;

			context.fillStyle = formatHexColor(
				entry.color ?? LEADERBOARD_DEFAULT_ROW_COLOR,
			);
			fillRoundedRect(
				context,
				0,
				y,
				CANVAS_WIDTH,
				ENTRY_HEIGHT,
				ENTRY_RADIUS,
			);

			context.fillStyle = formatHexColor(WHITE);
			context.fillText(`#${entry.rank}`, TEXT_X, textY);
			context.fillText(
				`• ${trimText(entry.displayName, USERNAME_MAX_LENGTH)}`,
				TEXT_X + rankWidth + 16,
				textY,
			);
			context.fillText(
				score,
				CANVAS_WIDTH - SCORE_SPACE / 2 - scoreWidth / 2,
				textY,
			);

			y += ENTRY_HEIGHT + ENTRY_GAP;
		}

		return canvas.encode("png");
	}
}
