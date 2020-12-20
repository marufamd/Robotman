const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('ratelimit', {
            event: 'rateLimit',
            emitter: 'client'
        });
    }

    exec(info) {
        this.client.ratelimits++;

        const arr = [
            '**Ratelimit Hit**',
            `**Timeout:** ${info.timeout}ms (${info.timeout / 1000}s)`,
            `**Request Limit:** ${info.limit}`,
            `**Method:** ${info.method.toUpperCase()}`,
            `**Path:** \`${info.path}\``,
            `**Route:** \`${info.route}\``
        ];

        if (info.path.includes('channels')) arr.push(`**Channel:** <#${info.path.replace('/channels/', '').split('/')[0]}>`);
        this.client.log(arr, 'warn', { ping: this.ratelimits > 1 ? true : false });

        setTimeout(() => this.client.ratelimits--, 10000);
    }
};