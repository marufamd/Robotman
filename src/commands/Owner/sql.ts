import { Table } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { log } from '#util/logger';
import { pluralize } from '#util/misc';
import { send } from '@skyra/editable-commands';
import { oneLine } from 'common-tags';
import type { Message } from 'discord.js';
import { performance } from 'node:perf_hooks';
import { Sql } from 'postgres';
import { inject, injectable } from 'tsyringe';

@injectable()
export default class implements Command {
	public constructor(@inject('sql') private readonly sql: Sql<any>) {}

	public options: CommandOptions = {
		aliases: ['pg', 'psql', 'pgsql', 'postgres'],
		description: 'Runs an SQL query.',
		usage: '<query>',
		args: [
			{
				name: 'query',
				type: 'codeBlock',
				match: 'content',
				prompt: 'What query would you like to run?'
			},
			{
				name: 'json',
				match: 'flag',
				flags: ['json', 'export']
			}
		],
		owner: true
	};

	public async exec(message: Message, { query, json }: { query: string; json: boolean }) {
		try {
			const start = performance.now();
			const rows = await this.sql.unsafe(query);
			const executionTime = (performance.now() - start).toFixed(3);

			if (!rows.length) {
				return send(
					message,
					oneLine`
                    No rows were returned on \`${rows.command}\` query. 
                    ${rows.count ? `${rows.command === 'INSERT' ? 'Created' : 'Updated'} ${pluralize('row', rows.count)}.` : ''}`
				);
			}

			const result = json
				? JSON.stringify(rows, null, 4)
				: new Table()
						.setColumns(Object.keys(rows[0]))
						.addRows(rows.map((row) => Object.values(row)))
						.toString();

			return send(message, {
				content: `Returned ${pluralize('row', rows.count)} in ${executionTime}ms`,
				files: [
					{
						name: `output.${json ? 'json' : 'txt'}`,
						attachment: Buffer.from(result)
					}
				]
			});
		} catch (e) {
			log(e, 'error');
			return send(message, `An error occurred. \`${e.message}\``);
		}
	}
}
