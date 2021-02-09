import { Command, Listener } from 'discord-akairo';
import type { Message } from 'discord.js';
import { title } from '../../util';

export default class extends Listener {
    public constructor() {
        super('command-locked', {
            event: 'commandLocked',
            emitter: 'commandHandler'
        });
    }

    public async exec(message: Message, command: Command) {
        if (command.categoryID !== 'games') return;
        const game = title(command.id.replaceAll(/-|_/g, ' '));
        return message.channel.send(`There is already a game of ${game} in progress in this channel.`);
    }
}