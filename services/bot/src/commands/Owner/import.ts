import type { Command, CommandOptions } from '#util/commands';
import type { Rank } from '#util/ranks';
import { request } from '#util/request';
import type { Message } from 'discord.js';
import { Sql } from 'postgres';
import { send } from '@skyra/editable-commands';
import { inject, injectable } from 'tsyringe';

@injectable()
export default class implements Command {
	public constructor(@inject('sql') public sql: Sql<any>) {}

	public options: CommandOptions = {
		description: 'Imports leaderboard rankings',
		args: [
			{
				name: 'link',
				prompt: 'What is the link to the JSON file you would like to import?'
			}
		],
		owner: true,
		typing: true
	};

	public async exec(message: Message, { link }: { link: string }) {
		const { text } = await request.get(link);

		const body: (Rank & { rank: number })[] = JSON.parse(text);

		for (const item of body) {
			delete item.rank;
		}

		/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
		const rows = await this.sql<any>`
            insert into ranks
            ${this.sql(body as any, ...Object.keys(body[0]))}
            `;

		return send(message, `Imported **${rows.count}** ranks.`);
	}
}
