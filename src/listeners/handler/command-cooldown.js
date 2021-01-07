const { oneLine } = require('common-tags');
const { Listener } = require('discord-akairo');
const Interaction = require('../../structures/Interaction');
const { plural, wait } = require('../../util');

module.exports = class extends Listener {
    constructor() {
        super('command-cooldown', {
            event: 'cooldown',
            emitter: 'commandHandler'
        });
    }

    async exec(message, command, remaining) {
        const seconds = (remaining / 1000).toFixed(1);
        const interaction = message instanceof Interaction;

        const fn = (interaction ? message.respond : message.util.send).bind(message.util ?? message);

        const msg = await fn({
            content: oneLine`
            ${message.author}, please wait **${seconds}** ${plural('second', seconds)}
            before using \`${command.id}\` again. ${interaction ? '' : 'This message will delete when the cooldown ends.'}`,
            type: 'message',
            ephemeral: true
        });

        await wait(remaining);
        msg?.delete?.();
    }
};