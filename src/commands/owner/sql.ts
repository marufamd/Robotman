import { oneLine } from 'common-tags';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { codeblock, paste, plural } from '../../util';
import Table from '../../util/table';

export default class extends Command {
    public constructor() {
        super('sql', {
            aliases: ['sql', 'pg', 'psql', 'pgsql'],
            description: 'Runs an SQL query.',
            args: [
                {
                    id: 'query',
                    type: 'codeblock',
                    match: 'content',
                    prompt: {
                        start: 'What query would you like to run?'
                    }
                }
            ],
            ownerOnly: true,
            typing: true
        });
    }

    public async exec(message: Message, { query }: { query: string }) {
        try {
            const start = process.hrtime();
            const rows = await this.client.sql.unsafe(query);
            const executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            if (!rows.length) {
                return message.util.send(oneLine`
            No rows were returned on \`${rows.command}\` query. 
            ${rows.count ? `${rows.command === 'INSERT' ? 'Created' : 'Updated'} ${rows.count} ${plural('row', rows.count)}.` : ''}`);
            }

            const table = new Table()
                .setColumns(Object.keys(rows[0]))
                .addRows(rows.map(row => Object.values(row)))
                .render();

            const time = `Returned ${rows.length} ${plural('row', rows.count)} in ${executionTime}ms`;

            let result = `${codeblock(table)}\n${time}`;
            if (result.length > 2000) result = `Too long to display. Output was uploaded to hastebin ${await paste(table, '')}.\n\n${time}`;

            return message.util.send(result);
        } catch (e) {
            this.client.log(e, 'error');
            return message.util.send(`An error occurred. \`${e.message}\``);
        }
    }
}
