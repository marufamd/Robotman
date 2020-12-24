const { Command } = require('discord-akairo');
const { getPrefix } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('tagalias', {
            aliases: ['tag-alias', 'alias-tag'],
            description: {
                info: 'Manages tag aliases.',
                usage: '<-add|-delete> <tag> <aliases>',
                examples: [
                    '-add test test1',
                    '-delete test est1'
                ],
                mod: true
            },
            args: [
                {
                   id: 'add',
                   match: 'flag',
                   flag: ['-add', '-a', '--add'] 
                },
                {
                    id: 'remove',
                    match: 'flag',
                    flag: ['-delete', '-d', '-del', '-remove', '--delete', '--remove']
                },
                {
                    id: 'tag',
                    type: 'tag',
                    prompt: {
                        start: 'What tag would you like to manage aliases for?',
                        retry: (_, { phrase }) => `A tag with the name **${phrase}** does not exist. Please try again.`
                    }
                },
                {
                    id: 'aliases',
                    match: 'rest',
                    prompt: {
                        start: 'Which aliases would you like to manage?'
                    }
                }
            ]
        });
    }

    async exec(message, { add, remove, tag, aliases }) {
        if (!add && !remove) return message.util.send(`The correct usage is \`${getPrefix(message)}${message.util.parsed.alias} ${this.description.usage}\`.`);
        aliases = aliases.split(',').map(a => a.trim().replaceAll(/@|,/g, '').toLowerCase());

        const name = tag.get('name');
        let response;

        const plural = length => `alias${length === 1 ? '' : 'es'}`;

        if (add) {
            const added = await this.client.tags.addAliases(name, message.guild.id, ...aliases);
            if (added === 'none') response = `These aliases already exist. None were added.`;
            else response = `Added **${added.join(', ')}** ${plural(added.length)} to tag **${name}**`;
        } else if (remove) {
            const deleted = await this.client.tags.deleteAliases(name, message.guild.id, ...aliases);
            if (deleted === 'none') response = `These aliases do not exist. None were deleted.`;
            else response = `Deleted **${deleted.join(', ')}** ${plural(deleted.length)} for tag **${name}**`;
        }
        
        return message.util.send(response);
    }
};