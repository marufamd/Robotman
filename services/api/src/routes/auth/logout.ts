import { COOKIE_NAME } from '#util/constants';
import type { Route } from '#util/interfaces';
import { deleteCookie } from '#util/util';
import type { Request, Response } from 'polka';
import { setTimeout as sleep } from 'node:timers/promises';
import { OAuth2Routes } from 'discord-api-types/v9';
import fetch from 'node-fetch';

export default class implements Route {
	public auth = true;

	public async post(req: Request, res: Response) {
		const result = await this.revokeToken(res, req.auth.accessToken);

		if (result.success === false) {
			if (result.retry) {
				await sleep(result.retry);

				const retry = await this.revokeToken(res, req.auth.accessToken);

				if (retry?.success) return;
			}
		}

		if (result.error) {
			return res.send(500, { error: result.error });
		}
	}

	private async revokeToken(res: Response, token: string) {
		const params = {
			token,
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET
		};

		const result = await fetch(OAuth2Routes.tokenRevocationURL, {
			method: 'POST',
			body: new URLSearchParams(params).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		if (result.ok) {
			deleteCookie(res, COOKIE_NAME);
			res.send(200, { success: true });
			return { success: true };
		}

		if (result.status === 503) {
			const retryAfter = result.headers.get('Retry-After');
			return {
				success: false,
				retry: retryAfter === null ? 5000 : Number(retryAfter) * 1000
			};
		}

		return { error: (await result.json()).message };
	}
}
