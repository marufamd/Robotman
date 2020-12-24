const { Command } = require('discord-akairo');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('color', {
            aliases: ['color', 'colour', 'color-code', 'hex-code', 'hex', 'rgb'],
            description: {
                info: 'Displays information about a specified color.',
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
            },
            args: [
                {
                    id: 'color',
                    type: 'uppercase',
                    match: 'content',
                    prompt: {
                        start: 'What color would you like to view?',
                        retry: 'Invalid color. Please try again.'
                    }
                }
            ],
        });
    }

    async exec(message, { color }) {
        let resolve;
        const split = color.split(/ +/);

        if (split.length === 3 && !isNaN(this.parseRGB(split[0]))) {
            resolve = split.map(a => this.parseRGB(a));
        } else {
            resolve = color
                .replaceAll(/ +/g, '_')
                .replaceAll('#', '');
            resolve = resolve.length !== 6 ? parseInt(resolve) ?? resolve : resolve;
        }

        const resolvedColor = this.resolveColor(resolve);
        if (resolvedColor == null) return message.util.send('Invalid color.');

        const embed = this.client.util.embed().setColor(resolvedColor);

        if (embed.color === 16777215) embed.color = 16777200;

        const final = resolvedColor.toString(16);
        if (final === 'NaN') color = '0';

        const url = `https://www.beautycolorcode.com/${final}-1000x1000.png`;
        const hex = this.makeHex(final);
        const rgb = this.decimalToRGB(resolvedColor);
        embed
            .setDescription([
                `• Hex: ${hex}`,
                `• RGB: (${rgb.join(', ')})`,
                `• Integer: ${isNaN(resolvedColor) ? 0 : resolvedColor}`
            ])
            .setImage(url);

        return message.util.send(embed);
    }

    makeHex(color) {
        return `#${'0'.repeat(6 - color.length)}${color}`.toUpperCase();
    }

    parseRGB(str) {
        return parseInt(str.replace(/,/g, '').replace(/(\(|\))/g, ''));
    }

    decimalToRGB(decimal) {
        return [(decimal >> 16) & 0xff, (decimal >> 8) & 0xff, decimal & 0xff];
    }

    resolveColor(color) {
        if (typeof color === 'string') {
            if (color === 'RANDOM') return Math.floor(Math.random() * (0xffffff + 1));
            if (color === 'DEFAULT') return 0;
            if (color in colors) color = colors[color];
            else {
                color = color.replace('#', '');
                if (color.length > 6) return null;
                color = `#${'0'.repeat(6 - color.length)}${color}`.toUpperCase();
                if (!/^#[0-9A-F]{6}$/i.test(color)) return null;
                color = parseInt(color.replace('#', ''), 16);
            }
        } else if (Array.isArray(color)) {
            color = (color[0] << 16) + (color[1] << 8) + color[2];
        }

        if (color < 0 || color > 0xffffff || (color && isNaN(color))) return null;

        return color;
    }
};