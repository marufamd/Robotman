import { Argument, ArgumentTypeCasterWithInteraction, Category, Command } from 'discord-akairo';
import { APIInteractionResponseType, ApplicationCommandOptionType } from 'discord-api-types/v8';
import { Message } from 'discord.js';
import Interaction, { InteractionMessageOptions } from '../../structures/Interaction';
import { plural, title } from '../../util';

const INVALID: InteractionMessageOptions = { content: 'Invalid command or group.', type: APIInteractionResponseType.ChannelMessage, ephemeral: true };

export default class extends Command {
    public constructor() {
        super('help', {
            aliases: ['help', 'command', 'category', 'group'],
            description: {
                info: 'Shows information on a command or category.',
                usage: '<command or category>',
                examples: ['help ping']
            },
            args: [
                {
                    id: 'mod',
                    type: Argument.union('commandAlias', 'commandCategory')
                }
            ]
        });
    }

    public interactionOptions = {
        name: 'help',
        description: 'Shows information on a command or category.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'command',
                description: 'The command or category to view information for.'
            }
        ]
    };

    public async exec(message: Message, { mod }: { mod: Command | Category<string, Command> }) {
        return message.util.send(await this.main(mod, message));
    }

    public async interact(interaction: Interaction) {
        const option = interaction.option('command') as string;
        let mod: Command | Category<string, Command>;

        if (typeof option !== 'undefined') {
            const commandOrGroup = await (Argument.union('commandAlias', 'commandCategory') as ArgumentTypeCasterWithInteraction).bind(this)(interaction, option);
            if (commandOrGroup) mod = commandOrGroup;
        }

        return interaction.respond(await this.main(mod, interaction));
    }

    private main(mod: Command | Category<string, Command>, message: Message | Interaction) {
        const embed = this.client.util.embed();
        let disabled: string[] = [];
        let prefix = process.env.BOT_PREFIX;

        if (message instanceof Message) {
            disabled = this.client.settings.get(message.guild.id, 'disabled_commands', []) ?? [];
            prefix = this.client.util.getPrefix(message);
        }

        const hidden = (c: Command): boolean => !c.ownerOnly && !c.mod && !c.description?.disableHelp && !disabled.includes(c.id);

        if (!mod) {
            embed
                .setTitle('Commands')
                .setDescription(`Do \`${prefix}${(message as Message).util?.parsed?.command ?? this.id} ${this.description.usage}\` for more info on a command or category`)
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
        } else if (mod instanceof Command) {
            if (mod.ownerOnly || mod.mod || mod.description?.disableHelp || disabled.includes(mod.id)) return INVALID;
            const desc = this.client.util.getExtended(mod, prefix);

            embed
                .setTitle(`${prefix}${mod.id} ${mod.description.usage || ''}`)
                .setDescription(desc)
                .setFooter(`Category: ${title(mod.categoryID)}${this.cooldown > 2e3 ? ` | This command has a ${this.cooldown / 1000} second cooldown.` : ''}`);

            if (mod.description.examples?.length) embed.addField(plural('Example', mod.description.examples.length), this.client.util.formatExamples(mod, prefix));
            if (mod.aliases.length > 1) embed.addField('Aliases', mod.aliases.filter(a => a !== mod.id).join(', '));

            if (mod.interactionOptions) {
                embed.addFields({
                    name: 'Slash Command',
                    value: `/${mod.interactionOptions.name} ${mod.interactionOptions.options
                        ?.map(o => {
                            let name = `[${o.name}]`;
                            if (o.required) name = `<${o.name}>`;
                            return `[${name}](https://notarealwebsi.te/ '${o.description}')`;
                        })
                        .join(' ') ?? ''}`
                });
            }
        } else {
            const filtered = mod.filter(hidden);
            if (!filtered.size) return INVALID;

            embed.setTitle(`${title(filtered.first().categoryID)} Commands`);

            for (const c of filtered.values()) {
                embed.addField(`${prefix}${c.id} ${c.description.usage ?? ''}`, this.client.util.getDescription(c));
            }
        }

        return embed;
    }
}