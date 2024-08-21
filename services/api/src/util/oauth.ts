// Copyright (c) 2020 The Sapphire Community and its contributors. All rights reserved. MIT license.
// https://github.com/sapphiredev/plugins/blob/main/packages/api

import type { OAuthBody, Session } from '#util/interfaces';
import { checkPermissions } from '#util/util';
import type { DiscordUser } from '@robotman/types';
import type { RESTGetAPICurrentUserGuildsResult, RESTGetAPICurrentUserResult, RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v9';
import { OAuth2Routes, PermissionFlagsBits, RouteBases, Routes } from 'discord-api-types/v9';
import fetch from 'node-fetch';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export class OAuth {
	/* eslint-disable @typescript-eslint/explicit-member-accessibility */
	#auth: RESTPostOAuth2AccessTokenResult;
	#timestamp: number;
	#user: DiscordUser;
	/* eslint-enable @typescript-eslint/explicit-member-accessibility */

	private constructor(auth: RESTPostOAuth2AccessTokenResult) {
		this.#auth = auth;
	}

	public static create(auth: RESTPostOAuth2AccessTokenResult) {
		return new OAuth(auth).currentTimestamp();
	}

	public static async revoke(token: string) {
		const params = {
			token,
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET
		};

		const res = await fetch(OAuth2Routes.tokenRevocationURL, {
			method: 'POST',
			body: new URLSearchParams(params).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		if (res.ok) return true;

		if (res.status === 503) {
			const retryAfter = res.headers.get('Retry-After');
			return retryAfter === null ? 5000 : Number(retryAfter) * 1000;
		}

		return false;
	}

	public static async fetchToken(body: OAuthBody) {
		const params = {
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			grant_type: 'authorization_code',
			code: body.code,
			redirect_uri: body.redirectUri
		};

		const res = await fetch(OAuth2Routes.tokenURL, {
			method: 'POST',
			body: new URLSearchParams(params).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		const data = await res.json();

		if (res.ok) {
			return data as RESTPostOAuth2AccessTokenResult;
		}

		return { error: data?.error };
	}

	public async fetchUser() {
		const [user, guilds] = await Promise.all([
			this.fetch<RESTGetAPICurrentUserResult>(Routes.user()),
			this.fetch<RESTGetAPICurrentUserGuildsResult>(Routes.userGuilds())
		]);

		if (!user) return false;

		this.#user = {
			...user,
			tag: `${user.username}#${user.discriminator}`,
			avatar_url: user.avatar
				? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
				: `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`,
			guilds: (guilds ?? [])
				.filter(
					(g) =>
						(g.owner || checkPermissions(g, [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.Administrator]))
				)
				.map((g) => ({
					...g,
					icon_url: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
					acronym: g.name
						.replace(/'s /g, ' ')
						.replace(/\w+/g, (e) => e[0])
						.replace(/\s/g, '')
				})),
			expires: this.expires
		};

		return true;
	}

	public get expires() {
		return this.#timestamp + this.#auth.expires_in * 1000;
	}

	public get session() {
		return OAuth.encrypt({
			id: this.#user.id,
			expires: this.expires,
			accessToken: this.#auth.access_token,
			refreshToken: this.#auth.refresh_token
		});
	}

	public get user() {
		return this.#user;
	}

	private static encrypt(data: Session) {
		const iv = randomBytes(16);
		const cipher = createCipheriv('aes-256-cbc', process.env.CLIENT_SECRET, iv);
		return `${cipher.update(JSON.stringify(data), 'utf8', 'base64') + cipher.final('base64')}.${iv.toString('base64')}`;
	}

	public static decrypt(token: string) {
		const [data, iv] = token.split('.');
		const decipher = createDecipheriv('aes-256-cbc', process.env.CLIENT_SECRET, Buffer.from(iv, 'base64'));

		try {
			const parsed = JSON.parse(decipher.update(data, 'base64', 'utf8') + decipher.final('utf8')) as Session;
			return parsed.expires >= Date.now() ? parsed : null;
		} catch {
			return null;
		}
	}

	private async fetch<T>(route: string): Promise<T> {
		const res = await fetch(`${RouteBases.api}${route}`, {
			headers: {
				Authorization: `Bearer ${this.#auth.access_token}`
			}
		});

		return res.ok ? res.json() : null;
	}

	private currentTimestamp() {
		this.#timestamp = Date.now();
		return this;
	}
}
