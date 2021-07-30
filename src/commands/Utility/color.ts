import { resolveArgument } from '#util/arguments';
import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { makeHex } from '#util/misc';
import { stripIndents } from 'common-tags';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { Canvas } from 'skia-canvas';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['colour', 'hex', 'rgb'],
        description: 'Displays information about a specified color.',
        extended: 'Color can be a hex code, integer, RGB value, or a specific name of a color from a pre-defined list.',
        usage: '<color>',
        example: [
            '#e67E22',
            '0xE67E22',
            'dark orange',
            '3447003',
            '(230, 126, 34)',
            '230 126 34'
        ],
        args: [
            {
                name: 'color',
                type: 'color',
                match: 'content',
                prompt: 'What color would you like to view?'
            }
        ],
        typing: true
    };

    public interactionOptions: ApplicationCommandOptionData[] = [
        {
            name: 'color',
            description: 'The color to show information for.',
            type: 'STRING',
            required: true
        }
    ];

    public async exec(message: Message, { color }: { color: number }) {
        return message.send(await this.run(color));
    }

    public async interact(interaction: CommandInteraction, { color }: { color: string }) {
        const resolved = resolveArgument(color, 'color');

        if (!resolved) {
            return interaction.reply({
                content: 'Invalid color.',
                ephemeral: true
            });
        }

        return interaction.reply(await this.run(resolved));
    }

    private async run(color: number) {
        const embed = new Embed().setColor(color);

        if (embed.color === 16777215) {
            embed.color = 16777200;
        }

        let final = color.toString(16);

        if (final === 'NaN') {
            final = '0';
            color = 0;
        }

        const hex = makeHex(final);
        const image = await this.makeImage(hex);
        const rgb = this.decimalToRGB(color);

        embed
            .setDescription(
                stripIndents`
                • Hex: ${hex}
                • RGB: (${rgb.join(', ')})
                • Integer: ${isNaN(color) ? 0 : color}`
            )
            .setImage('attachment://color.png');

        return {
            embeds: [embed],
            files: [{ name: 'color.png', attachment: image }]
        };
    }

    private makeImage(color: string) {
        const canvas = new Canvas(300, 300);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        return canvas.toBuffer('png');
    }

    private decimalToRGB(decimal: number) {
        return [(decimal >> 16) & 0xff, (decimal >> 8) & 0xff, decimal & 0xff];
    }
}