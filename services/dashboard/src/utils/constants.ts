import { AutoResponseTypes } from '@robotman/types';

export const AUTO_RESPONSE_HEADERS = {
	id: 'ID',
	name: 'Name',
	type: 'Type',
	content: 'Content',
	author_tag: 'Created by',
	editor_tag: 'Last Edited by',
	created: 'Created'
};

export const ACTION_HISTORY_HEADERS = {
	date: 'Date',
	user: 'User',
	action: 'Action'
};

export const AUTO_RESPONSE_VARIABLES = {
	user: 'The mention of the author of the message.',
	username: 'The username of the author of the message.',
	avatar: 'The avatar of the author of the message.',
	server: 'The name of the server.',
	channel: 'The name of the channel.'
};

export const AUTO_RESPONSE_TYPES = [
	AutoResponseTypes.Regular,
	AutoResponseTypes.Writer,
	AutoResponseTypes.Character,
	AutoResponseTypes.Moderator,
	AutoResponseTypes.Booster
];

export const OAUTH_URL = `https://discord.com/api/oauth2/authorize?${new URLSearchParams({
	client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
	response_type: 'code',
	scope: 'identify guilds',
	redirect_url: `${process.env.NEXT_PUBLIC_WEB_URL}/auth/callback`,
	prompt: 'none'
})}`;

export const STORAGE_KEY = 'discord_data';

export interface FormattedHistory {
	date: Date;
	user: string;
	action: string;
}
