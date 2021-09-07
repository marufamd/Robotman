import type { Snowflake } from 'discord-api-types/v9';

export enum Actions {
	Add = 'add',
	Edit = 'edit',
	Delete = 'delete'
}

export interface ActionHistory extends DeletePayload {
	guild: Snowflake;
	action: Actions;
	response: string;
	date?: Date;
}

export interface DeletePayload {
	user: Snowflake;
	user_tag: string;
}
