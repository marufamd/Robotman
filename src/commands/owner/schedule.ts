import { Command } from 'discord-akairo';
import type { Message, Snowflake } from 'discord.js';
import { channels } from '../../util/constants';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const format = (day: number, hour: number, minute: number) => `${days[day]} at ${hour < 10 ? `0${hour}` : hour}:${minute < 10 ? `0${minute}` : minute}`;

export default class extends Command {
    public constructor() {
        super('schedule', {
            aliases: ['schedule'],
            description: 'Checks schedule configuration',
            args: [
                {
                    id: 'data',
                    type: (_: Message, phrase: string) => {
                        if (!phrase) return null;
                        const split = phrase.split(/ +/);
                        return split.length === 3 ? split.map(p => parseInt(p)) : null;
                    },
                    match: 'content'
                }
            ],
            ownerOnly: true
        });
    }

    public async exec(message: Message, { data }: { data: string | number[] }) {
        const { sql, config } = this.client;

        let response: string;
        let reload = false;

        if (data) {
            const formatted = `{${(data as number[]).join(', ')}}`;

            const [row] = await sql`
                update ${sql(config.table)} set
                schedule = ${formatted}
                where id = 1
                
                returning *
                `;

            if (!row) {
                response = 'Unable to set schedule.';
            } else {
                reload = true;
                response = `Set schedule to ${format(...data as [number, number, number])}.`;
            }
        } else {
            const [row] = await sql<{ webhook_url: string; schedule: number[] }>`
                select schedule
                from ${sql(config.table)}
                where id = 1;
                `;

            let str = '__**Current Configuration**__';

            const channel = this.client.channels.cache.get(channels.NEWS.COMICS as Snowflake);

            if (channel) {
                str += `\n**Channel:** ${channel.toString()}`;
            }

            if (row.schedule) {
                const [day, hour, minute] = row.schedule;
                str += `\n**Schedule:** ${format(day, hour, minute)}`;
            }

            if (!row.schedule && !channel) {
                response = 'There is no configuration currently set.';
            } else {
                response = str;
            }
        }

        if (reload) void this.client.loadSchedule();
        return message.util.send(response);
    }
}