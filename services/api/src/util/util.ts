import type { Session, TransformedAutoResponse } from '#util/interfaces';
import type { ActionHistory, AutoResponsePayload } from '@robotman/types';
import type { RESTAPIPartialCurrentUserGuild } from 'discord-api-types/v9';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Response } from 'polka';
import type { Sql } from 'postgres';
import { container } from 'tsyringe';

export async function createHistory(payload: ActionHistory) {
	const sql = container.resolve<Sql<any>>('sql');
	await sql<ActionHistory[]>`
	insert into history
    ${sql(payload as any, ...Object.keys(payload))}
	`;
}

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

export function checkPermissions(guild: RESTAPIPartialCurrentUserGuild, bit: bigint) {
	return (BigInt(guild.permissions) & bit) === bit;
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

// Copyright (c) 2020 The Sapphire Community and its contributors. All rights reserved. MIT license.
// https://github.com/sapphiredev/plugins/blob/main/packages/api/src/lib/structures/http/Auth.ts

export function encryptSession(data: Session): string {
	const iv = randomBytes(16);
	const cipher = createCipheriv('aes-256-cbc', process.env.CLIENT_SECRET, iv);
	return `${cipher.update(JSON.stringify(data), 'utf8', 'base64') + cipher.final('base64')}.${iv.toString('base64')}`;
}

export function decryptSession(token: string): Session | null {
	const [data, iv] = token.split('.');
	const decipher = createDecipheriv('aes-256-cbc', process.env.CLIENT_SECRET, Buffer.from(iv, 'base64'));

	try {
		const parsed = JSON.parse(decipher.update(data, 'base64', 'utf8') + decipher.final('utf8')) as Session;
		return parsed.expires >= Date.now() ? parsed : null;
	} catch {
		return null;
	}
}
