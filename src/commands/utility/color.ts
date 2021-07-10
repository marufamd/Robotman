import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { colors } from '../../util/constants';

export default class extends Command {
    public constructor() {
        super('color', {
            aliases: ['color', 'colour', 'color-code', 'hex-code', 'hex', 'rgb'],
            description: 'Displays information about a specified color.',
            args: [
                {
                    id: 'color',
                    type: (_, phrase) => {
                        if (!phrase) return null;
                        return this.resolveString(phrase);
                    },
                    match: 'content',
                    prompt: {
                        start: 'What color would you like to view?',
                        retry: 'Invalid color. Please try again. What color would you like to view?'
                    }
                }
            ]
        });
    }

    public data = {
        usage: '<color>',
        extended: [`Color can be a hex code, integer, RGB value, or a specific name of a color from a pre-defined list.`],
        examples: [
            '#e67E22',
            '0xE67E22',
            'dark orange',
            '3447003',
            '(230, 126, 34)',
            '230 126 34'
        ]
    };

    public interactionOptions = {
        name: 'color',
        description: 'Displays information about a specified color.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'color',
                description: 'The color to show information for.',
                required: true
            }
        ]
    };

    public exec(message: Message, { color }: { color: number }) {
        return message.util.send(this.run(color));
    }

    public interact(interaction: CommandInteraction, { color }: { color: string }) {
        const resolved = this.resolveString(color);
        if (resolved === null) return interaction.reply({ content: 'Invalid Color.', ephemeral: true });

        return interaction.reply(this.run(resolved));
    }

    private run(color: number) {
        const embed = this.client.util.embed().setColor(color);

        if (embed.color === 16777215) embed.color = 16777200;

        let final = color.toString(16);
        if (final === 'NaN') {
            final = '0';
            color = 0;
        }

        const url = `https://www.beautycolorcode.com/${this.makeHex(final, false)}-1000x1000.png`;
        const hex = this.makeHex(final);
        const rgb = this.decimalToRGB(color);

        embed
            .setDescription(stripIndents`
                • Hex: ${hex}
                • RGB: (${rgb.join(', ')})
                • Integer: ${isNaN(color) ? 0 : color}
            `)
            .setImage(url);

        return { embeds: [embed] };
    }

    private resolveString(phrase: string) {
        phrase = phrase.toUpperCase();

        let resolve;
        const split = phrase.split(/ +/);

        if (split.length === 3 && !isNaN(this.parseRGB(split[0]))) {
            resolve = split.map(a => this.parseRGB(a));
        } else {
            resolve = phrase
                .replaceAll(/ +/g, '_')
                .replaceAll('#', '');
            resolve = resolve.length !== 6 ? (isNaN(parseInt(resolve)) ? resolve : parseInt(resolve)) : resolve;
        }

        const resolved = this.resolveColor(resolve);
        if (resolved == null) return null;

        return resolved;
    }

    private makeHex(color: string, prefix = true) {
        const formatted = color.padStart(6, '0').toUpperCase();
        return prefix ? `#${formatted}` : formatted;
    }

    private parseRGB(str: string) {
        return parseInt(str.replace(/,/g, '').replace(/(\(|\))/g, ''));
    }

    private decimalToRGB(decimal: number) {
        return [(decimal >> 16) & 0xff, (decimal >> 8) & 0xff, decimal & 0xff];
    }

    private resolveColor(color: any) {
        if (typeof color === 'string') {
            if (color === 'RANDOM') return Math.floor(Math.random() * (0xffffff + 1));
            if (color === 'DEFAULT') return 0;
            if (color in colors) {
                color = (colors as Record<string, number>)[color];
            } else {
                color = color.replace('#', '');
                if (color.length > 6) return null;
                color = this.makeHex(color);
                if (!/^#[0-9A-F]{6}$/i.test(color)) return null;
                color = parseInt(color.replace('#', ''), 16);
            }
        } else if (Array.isArray(color)) {
            color = (color[0] << 16) + (color[1] << 8) + color[2];
        }

        if (color < 0 || color > 0xffffff || (color && isNaN(color))) return null;

        return color;
    }
}