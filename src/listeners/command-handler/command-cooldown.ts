import { oneLine } from 'common-tags';
import { Listener, Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';
import { plural, wait } from '../../util';

export default class extends Listener {
    public constructor() {
        super('command-cooldown', {
            event: 'cooldown',
            emitter: 'commandHandler'
        });
    }

    public async exec(message: Message | Interaction, command: Command, remaining: number) {
        const seconds: number = (remaining / 1000);
        const interaction = message instanceof Interaction;

        const fn = (interaction ? (message as Interaction).respond : (message as Message).util.send).bind((message as Message).util ?? message);

        const msg = await fn({
            content: oneLine`
            ${message.author}, please wait **${seconds.toFixed(1)}** ${plural('second', seconds)}
            before using \`${command.id}\` again. ${interaction ? '' : 'This message will delete when the cooldown ends.'}`,
            type: 'message',
            ephemeral: true
        });

        await wait(remaining);
        void (msg as Message)?.delete?.();
    }
}