import type { Snowflake } from 'discord-api-types/v9';

export enum AutoResponseTypes {
	Regular = 'regular',
	Writer = 'writer',
	Character = 'character',
	Moderator = 'moderator',
	Booster = 'booster'
}

export interface AutoResponsePayload {
	name?: string;
	type: AutoResponseTypes;
	guild: Snowflake;
	content: string;
	aliases: string[];
	author: Snowflake;
	author_tag: string;
	editor?: Snowflake;
	editor_tag?: string;
	wildcard: boolean;
	embed: boolean;
	embed_color: `#${string}`;
}

export interface AutoResponse extends AutoResponsePayload {
	id: number;
	created: string;
	updated?: string;
}
