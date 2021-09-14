import type { RESTGetAPICurrentUserResult, RESTAPIPartialCurrentUserGuild } from 'discord-api-types/v9';

export interface DiscordUser extends RESTGetAPICurrentUserResult {
	tag: string;
	avatar_url: string;
	guilds: DiscordGuild[];
	expires: number;
}

export interface DiscordGuild extends RESTAPIPartialCurrentUserGuild {
	icon_url?: string;
	acronym: string;
}
