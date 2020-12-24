const { oneLine } = require('common-tags');
const { Listener } = require('discord-akairo');
const { plural, wait } = require('../../util');

module.exports = class extends Listener {
    constructor() {
        super('cooldown', {
            event: 'cooldown',
            emitter: 'commandHandler'
        });
    }

    async exec(message, command, remaining) {
        const seconds = remaining / 1000;

        const msg = await message.util.send(oneLine`
        **${message.author.username}**, please wait **${seconds}** ${plural('second', seconds)}
        before using \`${command.id}\` again. This message will delete when the cooldown ends.
        `);

        await wait(remaining);
        msg.delete();
    }
};