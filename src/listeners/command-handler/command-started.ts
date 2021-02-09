import { Command, Listener } from 'discord-akairo';
import type { Message } from 'discord.js';
import type { BotStats } from '../../structures/ConfigManager';

export default class extends Listener {
    public constructor() {
        super('command-started', {
            event: 'commandStarted',
            emitter: 'commandHandler'
        });
    }

    public exec(_: Message, command: Command) {
        if (command.categoryID !== 'games') return;
        let val: keyof BotStats;

        if (command.id === 'akinator') {
            val = 'aki';
        } else {
            val = command.id.replaceAll('-', '_') as keyof BotStats;
        }

        void this.client.config.stat(val);
    }
}