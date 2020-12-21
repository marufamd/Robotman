const { Command, Argument } = require('discord-akairo');
const { title, plural } = require('../../util');

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
        const prefix = this.getPrefix(message);

        if (!mod) {
            embed
                .setTitle('Commands')
                .setDescription(`Do \`${prefix}${message.util.parsed.command} ${this.description.usage}\` for more info on a command or category`)
                .setFooter(`Hover over a command for descriptions`);

            for (let category of this.handler.categories.values()) {
                category = category.filter(c => !c.ownerOnly && !disabled.includes(c.id));
                if (!category.size) continue;

                embed.addField(title(category.first().categoryID), category.map(c => `[\`${c.id}\`](https://notarealwebsi.te/ '${this.getDescription(c)}')`).join(' '), true);
            }

            if ([5, 8].includes(embed.fields.length)) embed.addField('\u200b', '\u200b', true);
        } else {
            if (mod instanceof Command) {
                if (mod.ownerOnly || disabled.includes(mod.id)) return this.invalid(message);
                let desc = this.getDescription(mod);
                if (mod.description.extended?.length) desc += `\n\n${mod.description.extended.join('\n').replaceAll('{p}', prefix)}`;

                embed
                    .setTitle(`${prefix}${mod.id} ${mod.description.usage || ''}`)
                    .setDescription(desc)
                    .setFooter(`Category: ${title(mod.categoryID)}${this.ratelimit > 2 ? ` | This command has a ${this.ratelimit} second cooldown.` : ''}`);

                if (mod.description.examples?.length) embed.addField(plural('Example', mod.description.examples.length), this.makeExamples(prefix));
                if (mod.aliases.length > 1) embed.addField('Aliases', mod.aliases.filter(a => a !== mod.id).join(', '));
            } else {
                mod = mod.filter(c => !c.ownerOnly && !disabled.includes(c.id));
                if (!mod.size) return this.invalid(message);

                embed.setTitle(`${title(mod.first().categoryID)} Commands`);

                for (const c of mod.values()) embed.addField(`${prefix}${c.id} ${c.description.usage || ''}`, this.getDescription(c));
            }
        }

        return message.util.send(embed);
    }

    getPrefix(message) {
        return new RegExp(`<@!?${this.client.user.id}>`).test(message.util.parsed.prefix) ? `@${this.client.user.tag} ` : message.util.parsed.prefix;
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