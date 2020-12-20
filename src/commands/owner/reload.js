const { Command, Argument, Category } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('reload', {
            aliases: ['reload'],
            description: {
                info: 'Reloads a module or category',
                usage: '<module or category>',
                examples: [
                    'ping',
                    'user-info'
                ],
            },
            ownerOnly: true,
            args: [
                {
                    id: 'mod',
                    type: Argument.union('commandAlias', 'commandCategory', 'listener')
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

    async exec(message, { mod, all }) {
        let response;

        if (all) {
            const handler = `${all.slice(0, -1)}Handler`;
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
                response = `Reload module \`${mod.id}\`.`;
            }
        }

        return message.util.send(response);
    }
};