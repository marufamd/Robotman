import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatRelativeDate(timestamp: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(timestamp));
}

export function hexToDiscordColor(hex: string) {
	return Number.parseInt(hex.replace("#", ""), 16);
}

export function discordColorToHex(color: number | null) {
	if (color === null) {
		return "#ff8c37";
	}

	return `#${color.toString(16).padStart(6, "0")}`;
}
