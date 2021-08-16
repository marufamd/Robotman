import type { Snowflake } from 'discord.js';

export enum AutoResponseTypes {
	Writer = 'writer',
	Character = 'character',
	TasteTest = 'taste_test',
	Regular = 'regular'
}

export interface AutoResponse {
	id: number;
	name: string;
	type: AutoResponseTypes;
	guild: Snowflake;
	content: string;
	aliases?: string[];
	author: Snowflake;
	editor?: Snowflake;
	created: number;
	updated?: number;
	wildcard: boolean;
	embed: boolean;
	embed_color?: number;
}

export function transformPayload(body: Record<string, any>): any {
	if (Reflect.has(body, 'aliases')) {
		body.aliases = `{${body.aliases.join(',')}}`;
	}

	return body;
}
