import { COOKIE_NAME } from '#util/constants';
import type { OAuthBody, Route } from '#util/interfaces';
import { Methods } from '#util/interfaces';
import { log } from '#util/log';
import { checkPermissions, encryptSession } from '#util/util';
import type { RESTGetAPICurrentUserGuildsResult, RESTGetAPICurrentUserResult, RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v9';
import { APIVersion as version, PermissionFlagsBits, OAuth2Routes, Routes } from 'discord-api-types/v9';
import fetch from 'node-fetch';
import type { Request, Response } from 'polka';
import type { DiscordUser } from '@robotman/types';

export default class implements Route {
	private readonly allowedGuilds = process.env.ALLOWED_GUILDS.split(' ');

	public async post(req: Request, res: Response) {
		const body = req.body as OAuthBody;

		if (typeof body?.code !== 'string') {
			return res.send(400, { error: 'No code provided.' });
		}

		const auth = await this.fetchAuth(body);

		if (auth === null) {
			return res.send(500, { error: 'Unable to fetch token.' });
		}

		const now = Date.now();

		const [user, guilds] = await Promise.all([
			this.fetchData<RESTGetAPICurrentUserResult>(auth.access_token, Routes.user()),
			this.fetchData<RESTGetAPICurrentUserGuildsResult>(auth.access_token, Routes.userGuilds())
		]);

		if (!user) {
			return res.send(500, { error: 'Unable to fetch user.' });
		}

		const data: DiscordUser = {
			...user,
			tag: `${user.username}#${user.discriminator}`,
			avatar_url: user.avatar
				? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
				: `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`,
			guilds: (guilds ?? [])
				.filter(
					(g) =>
						(g.owner || checkPermissions(g, PermissionFlagsBits.ManageGuild) || checkPermissions(g, PermissionFlagsBits.Administrator)) &&
						this.allowedGuilds.includes(g.id)
				)
				.map((g) => ({
					...g,
					icon_url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
					acronym: g.name
						.replace(/'s /g, ' ')
						.replace(/\w+/g, (e) => e[0])
						.replace(/\s/g, '')
				}))
		};

		const session = encryptSession({
			id: data.id,
			expires: now + auth.expires_in * 1000,
			refreshToken: auth.refresh_token,
			accessToken: auth.access_token
		});

		res.cookie(COOKIE_NAME, session, { maxAge: auth.expires_in, httpOnly: true, path: '/' });
		res.send(200, data);
	}

	private async fetchAuth(body: OAuthBody) {
		const params = {
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			code: body.code,
			grant_type: 'authorization_code',
			redirect_uri: body.redirectUri
		};

		const res = await fetch(OAuth2Routes.tokenURL, {
			method: 'POST',
			body: new URLSearchParams(params).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		const json = await res.json();

		if (res.ok) {
			return json as RESTPostOAuth2AccessTokenResult;
		}

		log(json, 'error', { path: '/auth/callback', method: Methods.Post });

		return null;
	}

	private async fetchData<T>(token: string, path: string) {
		const res = await fetch(`https://discord.com/api/v${version}${path}`, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		return res.ok ? ((await res.json()) as T) : null;
	}
}
