import {
    Argument,
    Category,
    Command,
    Inhibitor,
    Listener
} from 'discord-akairo';
import type { Message } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('reload', {
            aliases: ['reload'],
            description: 'Reloads a module or category.',
            ownerOnly: true,
            args: [
                {
                    id: 'mod',
                    type: Argument.union('commandAlias', 'commandCategory', 'listener', 'inhibitor')
                },
                {
                    id: 'all',
                    type: ['commands', 'listeners', 'inhibitors'],
                    match: 'option',
                    flag: ['-all=', '-a=', 'all:']
                }
            ]
        });
    }

    public data = {
        usage: '<module or category>',
        examples: [
            'ping',
            'user-info',
            'all:commands'
        ]
    };

    public exec(message: Message, { mod, all }: { mod: Command | Category<string, any> | Inhibitor | Listener; all: 'commands' | 'listeners' | 'inhibitors' }) {
        let response;

        if (all) {
            const handler = `${all.slice(0, -1)}Handler` as 'commandHandler' | 'inhibitorHandler' | 'listenerHandler';
            if (!(handler in this.client)) return message.util.send('Invalid handler.');
            this.client[handler].reloadAll();
            response = `Reloaded all ${all}.`;
        } else {
            if (!mod) return message.util.send('Invalid module or category.');
            if (mod instanceof Category) {
                mod.reloadAll();
                response = `Reloaded category \`${mod.id}\`.`;
            } else {
                mod.reload();
                response = `Reloaded module \`${mod.id}\`.`;
            }
        }

        return message.util.send(response);
    }
}