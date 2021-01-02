const { oneLine } = require('common-tags');
const { Listener } = require('discord-akairo');
const Interaction = require('../../structures/Interaction');
const { plural, wait } = require('../../util');

module.exports = class extends Listener {
    constructor() {
        super('cooldown', {
            event: 'cooldown',
            emitter: 'commandHandler'
        });
    }

    async exec(message, command, remaining) {
        const seconds = (remaining / 1000).toFixed(1);

        const fn = (message instanceof Interaction ? message.respond : message.util.send).bind(message.util ?? message);

        const msg = await fn({
            content: oneLine`
            **${message.author}**, please wait **${seconds}** ${plural('second', seconds)}
            before using \`${command.id}\` again. ${message instanceof Interaction ? '' : 'This message will delete when the cooldown ends.'}`,
            type: 'message',
            ephemeral: true
        });

        console.log(msg);
        await wait(remaining);
        msg.delete?.();
    }
};