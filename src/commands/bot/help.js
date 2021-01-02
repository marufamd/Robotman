const { Command, Argument } = require('discord-akairo');
const { title, plural } = require('../../util');

const INVALID = 'Invalid command or group.';

module.exports = class extends Command {
    constructor() {
        super('help', {
            aliases: ['help', 'command', 'category', 'group'],
            description: {
                info: 'Shows information on a command or category.',
                usage: '<command or category>',
                examples: ['help ping'],
            },
            args: [
                {
                    id: 'mod',
                    type: Argument.union('commandAlias', 'commandCategory')
                }
            ]
        });
    }

    interactionOptions = {
        name: 'help',
        description: 'Shows information on a command or category.',
        options: [
            {
                type: 'string',
                name: 'command',
                description: 'The command or category to view information for.'
            }
        ]
    }

    async exec(message, { mod }) {
        return message.util.send(this.main(mod, message));
    }

    async interact(interaction) {
        let option = interaction.option('command');

        if (typeof option !== 'undefined') {
            const command = this.handler.resolver.type('commandAlias')(null, option);
            if (command) {
                option = command;
            } else {
                const group = this.handler.resolver.type('commandCategory')(interaction, option);
                if (group) option = group;
            }
        }

        return interaction.respond(this.main(option, interaction));
    }

    main(mod, message) {
        const embed = this.client.util.embed();
        const disabled = this.client.settings.get(message.guild?.id, 'disabledCommands', []) ?? [];
        const prefix = this.client.util.getPrefix(message);

        const hidden = c => !c.ownerOnly && !c.description?.mod && !c.description?.disableHelp && !disabled.includes(c.id);

        if (!mod) {
            embed
                .setTitle('Commands')
                .setDescription(`Do \`${prefix}${message.util?.parsed?.command ?? this.id} ${this.description.usage}\` for more info on a command or category`)
                .setFooter(`Hover over a command for descriptions`);

            for (let category of this.handler.categories.values()) {
                category = category.filter(hidden);
                if (!category.size) continue;

                embed.addField(
                    title(category.first().categoryID.replace('-', ' & ')).replace('Tv', 'TV'),
                    category.map(c => `[\`${c.id}\`](https://notarealwebsi.te/ '${this.client.util.getDescription(c)}')`).join(' '),
                    true
                );
            }

            embed.inlineFields();
        } else {
            if (mod instanceof Command) {
                if (mod.ownerOnly || mod.description?.disableHelp || disabled.includes(mod.id)) return INVALID;
                const desc = this.client.util.getExtended(mod, prefix);

                embed
                    .setTitle(`${prefix}${mod.id} ${mod.description.usage || ''}`)
                    .setDescription(desc)
                    .setFooter(`Category: ${title(mod.categoryID)}${this.ratelimit > 2 ? ` | This command has a ${this.ratelimit} second cooldown.` : ''}`);

                if (mod.interactionOptions) embed.addField('Slash Command', `/${mod.interactionOptions.name} ${mod.interactionOptions.options
                    ?.map(o => {
                        let name = `[${o.name}\\]`;
                        if (o.required) name = `<${o.name}>`;
                        return `[${name}](https://notarealwebsi.te/ '${o.description}')`;
                    })
                    .join(' ') ?? ''}
                    `);

                if (mod.description.examples?.length) embed.addField(plural('Example', mod.description.examples.length), this.client.util.formatExamples(mod, prefix));
                if (mod.aliases.length > 1) embed.addField('Aliases', mod.aliases.filter(a => a !== mod.id).join(', '));
            } else {
                mod = mod.filter(hidden);
                if (!mod.size) return INVALID;

                embed.setTitle(`${title(mod.first().categoryID)} Commands`);

                for (const c of mod.values()) embed.addField(`${prefix}${c.id} ${c.description.usage || ''}`, this.client.util.getDescription(c));
            }
        }

        return embed;
    }
};