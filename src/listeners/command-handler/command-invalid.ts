import { Listener } from 'discord-akairo';
import { Message } from 'discord.js';

export default class extends Listener {
    public constructor() {
        super('command-invalid', {
            event: 'messageInvalid',
            emitter: 'commandHandler'
        });
    }

    public async exec(message: Message) {
        if (!message?.util?.parsed?.afterPrefix) return;
        const { commandHandler } = this.client;

        const command = commandHandler.modules.get('tag');
        if (!command) return;
        const args = await command.parse(message, message?.util?.parsed?.afterPrefix);

        return commandHandler.runCommand(message, command, args);
    }
}