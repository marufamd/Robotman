import { Listener } from 'discord-akairo';
import { RateLimitData } from 'discord.js';
import { wait } from '../../util';

export default class extends Listener {
    public constructor() {
        super('ratelimit', {
            event: 'rateLimit',
            emitter: 'client'
        });
    }

    public async exec(info: RateLimitData) {
        this.client.ratelimits++;

        const title = `Ratelimit Hit [${info.method.toUpperCase()}]`;

        const fields = [
            {
                name: 'Path',
                value: `\`${info.path}\``
            },
            {
                name: 'Route',
                value: `\`${info.route}\``
            },
            {
                name: 'Timeout',
                value: `${info.timeout}ms (${info.timeout / 1000}s)`,
                inline: true
            },
            {
                name: 'Request Limit',
                value: info.limit,
                inline: true
            }
        ];

        if (info.path.includes('channels')) {
            fields.push({
                name: 'Channel',
                value: `<#${info.path.replace('/channels/', '').split('/')[0]}>`,
                inline: true
            });
        }

        this.client.log(title, 'warn', { ping: this.client.ratelimits > 1 }, {
            title,
            description: '',
            fields
        });

        await wait(10000);
        this.client.ratelimits--;
    }
}