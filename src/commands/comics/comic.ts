import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, NO_RESULTS_FOUND } from '#util/constants';
import { trim } from '#util/misc';
import { comixology } from '#util/wrappers';
import { toTitleCase } from '@sapphire/utilities';
import { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['comixology', 'issue', 'trade'],
        description: 'Searches ComiXology for an issue/trade.',
        extended: 'More specific queries will give a more accurate result (e.g. including the launch year of the book, the writer, etc)',
        usage: '<query>',
        example: [
            'daredevil 1 zdarsky',
            'batman 50'
        ],
        args: [
            {
                name: 'query',
                match: 'content',
                prompt: 'What would you like to search for?'
            }
        ],
        cooldown: 10,
        typing: true
    };

    public interactionOptions: ApplicationCommandOptionData[] = [
        {
            name: 'query',
            description: 'The issue/trade to search for.',
            type: 'STRING',
            required: true
        }
    ];

    public async exec(message: Message, { query }: { query: string }) {
        return message.send(await this.run(query));
    }

    public async interact(interaction: CommandInteraction, { query }: { query: string }) {
        return interaction.reply(await this.run(query));
    }

    private async run(query: string) {
        const comic = await comixology(query);
        if (!comic) return NO_RESULTS_FOUND;

        const embed = new Embed()
            .setColor(Colors.COMIXOLOGY)
            .setAuthor(comic.publisher.name, comic.publisher.image)
            .setTitle(comic.name)
            .setURL(comic.url)
            .setDescription(trim(comic.description, 2048))
            .setThumbnail(comic.cover)
            .setFooter('ComiXology', 'https://i.imgur.com/w8RoAMX.png');

        for (const [name, credits] of Object.entries(comic.credits)) {
            if (credits.length) {
                embed.addField(`${toTitleCase(name)} By`, credits.join('\n'), true);
            }
        }

        if (comic.pageCount) {
            embed.addField('Page Count', comic.pageCount.toString(), true);
        }

        if (comic.releaseDate) {
            embed.addField('Release Date', comic.releaseDate, true);
        }

        return {
            embeds: [
                embed.inlineFields()
            ]
        };
    }
}