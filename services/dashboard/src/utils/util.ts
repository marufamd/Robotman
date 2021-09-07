import type { DiscordGuild, DiscordUser } from '@robotman/types';
import { createStandaloneToast } from '@chakra-ui/react';
import { STORAGE_KEY } from '#utils/constants';

export async function fetchAPI<T>(path: string, options: RequestInit = {}) {
	const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
		...options,
		credentials: 'include',
		headers: {
			...options.headers,
			'Content-Type': 'application/json'
		}
	});

	const json = await res.json();

	if (json.error) {
		throw new Error(json.error);
	} else {
		return json as T;
	}
}

export function getUserState(): DiscordUser {
	if (typeof window !== 'undefined') {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : null;
	}

	return null;
}

export function saveUserState(data: DiscordUser) {
	try {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		}
	} catch {}

	return data;
}

export function clearUserState() {
	if (typeof window !== 'undefined') {
		localStorage?.removeItem(STORAGE_KEY);
	}
}

export function toTitleCase(str: string): string {
	return str.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export const toast = createStandaloneToast({ colorMode: 'light' });

type Parser = (user?: DiscordUser, guild?: DiscordGuild) => string;

const replaceParsers: Record<string, Parser> = {
	user: (user) => `<@${user.id}>`,
	username: (user) => user.username,
	avatar: (user) => user.avatar_url,
	server: (_, guild) => guild.name,
	channel: (_, guild) => `<#${guild.id}>`
};

export function replaceVariables(user: DiscordUser, id: string, str: string) {
	for (const [key, parser] of Object.entries(replaceParsers)) {
		str = str.replaceAll(
			`{${key}}`,
			parser(
				user,
				user.guilds.find((g) => g.id === id)
			)
		);
	}

	return str;
}

export function trim(str: string, length: number) {
	return str.length > length ? `${str.substring(0, length)}...` : str;
}
