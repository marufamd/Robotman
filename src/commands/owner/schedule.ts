import { Command } from 'discord-akairo';
import type { Message, Snowflake } from 'discord.js';
import { parseWebhook } from '../../util';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const format = (day: number, hour: number, minute: number) => `${days[day]} at ${hour < 10 ? `0${hour}` : hour}:${minute < 10 ? `0${minute}` : minute}`;

export default class extends Command {
    private readonly WEBHOOK_REGEX = /https?:\/\/discord.com\/api\/webhooks\/[0-9]{17,22}\/.+/g;

    public constructor() {
        super('schedule', {
            aliases: ['schedule'],
            description: 'Checks schedule configuration',
            ownerOnly: true
        });
    }

    public *args(): unknown {
        const mode = yield {
            type: ['time', 'view', 'webhook'],
            default: 'view'
        };

        let data;

        if (mode === 'time') {
            data = yield {
                type: (_: Message, phrase: string) => {
                    if (!phrase) return null;
                    const split = phrase.split(/ +/);
                    return split.length === 3 ? split.map(p => parseInt(p)) : null;
                },
                match: 'rest',
                prompt: {
                    start: 'What would you like to set the schedule time to?',
                    retry: 'Invalid format. The correct format is `<weekday> <hour> <minute>`. Please try again'
                }
            };
        } else if (mode === 'webhook') {
            data = yield {
                type: (_: Message, phrase: string) => {
                    if (!phrase) return null;
                    const match = this.WEBHOOK_REGEX.exec(phrase);
                    return match ? match[0] : null;
                },
                prompt: {
                    start: 'Please provide a URL to the webhook you would like to set.',
                    retry: 'Invalid Webhook URL, please try again.'
                }
            };
        }

        return { mode, data };
    }

    public async exec(message: Message, { mode, data }: { mode: 'time' | 'view' | 'webhook'; data: string | number[] }) {
        const { sql, config } = this.client;

        let response: string;
        let reload = false;

        switch (mode) {
            case 'view': {
                const [row] = await sql<{ webhook_url: string; schedule: number[] }>`
                select ${sql(['webhook_url', 'schedule'])}
                from ${sql(config.table)}
                where id = 1;
                `;

                let str = '__**Current Configuration**__';

                if (row.schedule) {
                    const [day, hour, minute] = row.schedule;
                    str += `\n**Schedule:** ${format(day, hour, minute)}`;
                }

                if (row.webhook_url) {
                    const { id, token } = parseWebhook(row.webhook_url);
                    str += `\n**Webhook:** ${(await this.client.fetchWebhook(id as Snowflake, token)).name}`;
                }

                if (!row.webhook_url && !row.schedule) {
                    response = 'There is no configuration currently set.';
                } else {
                    response = str;
                }
            }
            break;

            case 'webhook': {
                await this.client.config.set('webhook_url', data as string);

                const { id, token } = parseWebhook(data as string);
                const webhook = await this.client.fetchWebhook(id as Snowflake, token).catch(() => null);

                if (!webhook) {
                    response = 'Invalid Webhook.';
                } else {
                    reload = true;
                    response = `Set webhook to **${webhook.name}**`;
                }
            }
            break;

            case 'time': {
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
            }
        }

        if (reload) void this.client.loadSchedule();
        return message.util.send(response);
    }
}