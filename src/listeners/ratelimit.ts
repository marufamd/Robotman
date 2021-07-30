import type { Listener } from '#util/commands';
import { log } from '#util/logger';
import type { RateLimitData } from 'discord.js';
import { Constants } from 'discord.js';

export default class implements Listener {
    public event = Constants.Events.RATE_LIMIT;

    public handle(info: RateLimitData) {
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
                value: info.limit.toString(),
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

        log(title, 'warn', { ping: true }, {
            title,
            description: '',
            fields
        });
    }
}