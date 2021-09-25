import type { TransformedAutoResponse } from '#util/interfaces';
import type { AutoResponsePayload } from '@robotman/types';
import type { RESTAPIPartialCurrentUserGuild } from 'discord-api-types/v9';
import type { Response } from 'polka';

export function trim(str: string, length: number) {
	return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function parseWebhook(url: string) {
	const split = url.split('/');

	return {
		id: split[5],
		token: split[6]
	};
}

export function checkPermissions(guild: RESTAPIPartialCurrentUserGuild, bits: bigint[]) {
	for (const bit of bits) {
		if ((BigInt(guild.permissions) & bit) === bit) return true;
	}

	return false;
}

export function deleteCookie(res: Response, name: string) {
	res.cookie(name, '', { expires: new Date(0), path: '/' });
}

export function transformPayload(body: AutoResponsePayload | TransformedAutoResponse) {
	if (Reflect.has(body, 'aliases')) {
		body.aliases = `{${(body as AutoResponsePayload).aliases.join(',')}}`;
	}

	return body as TransformedAutoResponse;
}

export function toTitleCase(str: string): string {
	return str.replace(/[A-Za-zÀ-ÖØ-öø-ÿ]\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
