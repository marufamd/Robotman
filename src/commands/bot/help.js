const { Command, Argument } = require('discord-akairo');
const { title, plural, getPrefix } = require('../../util');

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

    async exec(message, { mod }) {
        const embed = this.client.util.embed();
        const disabled = this.client.settings.get(message.guild.id, 'disabledCommands', []);
        const prefix = getPrefix(message);

        const hidden = c => !c.ownerOnly && !c.description?.mod  && !c.description?.disableHelp && !disabled.includes(c.id);

        if (!mod) {
            embed
                .setTitle('Commands')
                .setDescription(`Do \`${prefix}${message.util.parsed.command} ${this.description.usage}\` for more info on a command or category`)
                .setFooter(`Hover over a command for descriptions`);

            for (let category of this.handler.categories.values()) {
                category = category.filter(hidden);
                if (!category.size) continue;

                embed.addField(title(category.first().categoryID.replace('-', ' & ')).replace('Tv', 'TV'), category.map(c => `[\`${c.id}\`](https://notarealwebsi.te/ '${this.getDescription(c)}')`).join(' '), true);
            }

            embed.formatFields();
        } else {
            if (mod instanceof Command) {
                if (mod.ownerOnly || mod.description?.disableHelp || disabled.includes(mod.id)) return this.invalid(message);
                let desc = this.getDescription(mod);
                if (mod.description.extended?.length) desc += `\n\n${mod.description.extended.join('\n').replaceAll('{p}', prefix)}`;

                embed
                    .setTitle(`${prefix}${mod.id} ${mod.description.usage || ''}`)
                    .setDescription(desc)
                    .setFooter(`Category: ${title(mod.categoryID)}${this.ratelimit > 2 ? ` | This command has a ${this.ratelimit} second cooldown.` : ''}`);

                if (mod.description.examples?.length) embed.addField(plural('Example', mod.description.examples.length), this.makeExamples(mod, prefix));
                if (mod.aliases.length > 1) embed.addField('Aliases', mod.aliases.filter(a => a !== mod.id).join(', '));
            } else {
                mod = mod.filter(hidden);
                if (!mod.size) return this.invalid(message);

                embed.setTitle(`${title(mod.first().categoryID)} Commands`);

                for (const c of mod.values()) embed.addField(`${prefix}${c.id} ${c.description.usage || ''}`, this.getDescription(c));
            }
        }

        return message.util.send(embed);
    }

    getDescription(command) {
        return typeof command.description !== 'string' ? command.description.info : command.description;
    }

    invalid(message) {
        return message.util.send('Invalid command or group.');
    }

    makeExamples(mod, prefix) {
        return mod.description.examples
            .map(example => {
                if (mod.aliases.some(a => example.startsWith(a + ' '))) return `${prefix}${example}`;
                return `${prefix}${this.name} ${example}`;
            })
            .join('\n');
    }
};