const { Listener } = require('discord-akairo');
const { wait } = require('../../util');

module.exports = class extends Listener {
    constructor() {
        super('ratelimit', {
            event: 'rateLimit',
            emitter: 'client'
        });
    }

    async exec(info) {
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

        if (info.path.includes('channels')) fields.push({
            name: 'Channel',
            value: `<#${info.path.replace('/channels/', '').split('/')[0]}>`,
            inline: true
        });

        this.client.log(title, 'warn', { ping: this.ratelimits > 1 }, {
            title,
            description: '',
            fields
        });

        await wait(10000);
        this.client.ratelimits--;
    }
};