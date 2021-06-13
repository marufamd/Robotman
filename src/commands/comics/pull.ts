import { fetchReleases, FilterTypes, SortTypes } from 'comicgeeks';
import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { DateTime } from 'luxon';
import { getPullDate } from '../../util';
import { formats, Publisher, PublisherData, publishers, pull } from '../../util/constants';

const { previous, next } = pull.default;

export default class extends Command {
    public constructor() {
        super('pull', {
            aliases: ['pull', 'p', 'releases', previous, next].flat(),
            description: 'Gets the pull list for a publisher for a specified week. Defaults to DC.',
            args: [
                {
                    id: 'publisher',
                    type: (_, phrase) => {
                        if (!phrase) phrase = 'dc';
                        return publishers.has(phrase.toLowerCase() as Publisher) ? publishers.get(phrase.toLowerCase() as Publisher) : null;
                    },
                    otherwise: 'Invalid publisher.',
                    unordered: true
                },
                {
                    id: 'date',
                    type: 'parsedDate',
                    match: 'rest',
                    default: () => new Date(),
                    unordered: true
                }
            ],
            typing: true
        });
    }

    public data = {
        usage: '<publisher> [date]',
        extended: [
            'To get next week\'s pull list, do `{p}pullnext`',
            'To get last week\'s pull list, do `{p}pulllast`',
            'To get the pull list for a different week, you can put the date you want after the publisher\n',
            'Publisher codes are in codeblocks:\n',
            [...publishers]
                .map(([k, { name }]) => `${name} \`${k}\``)
                .join('\n')
        ],
        examples: [
            'dc',
            'pulllast marvel',
            'pullnext archie',
            'idw December 2 2020',
            'darkhorse 17 Jan 2021',
            'boom 2021-02-13'
        ]
    };

    public interactionOptions = {
        name: 'pull',
        description: 'Gets the pull list for a publisher for a specified week.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'publisher',
                description: 'The publisher to view the pull list for.',
                choices: [...publishers].map(([value, { name }]) => ({ name, value })).slice(0, 10),
                required: true
            },
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'date',
                description: 'The week to view the pull list for.'
            }
        ]
    };

    public async exec(message: Message, { publisher, date }: { publisher: PublisherData; date: Date }) {
        let week = getPullDate(DateTime.fromJSDate(date).setZone('utc'));

        const alias = message.util.parsed.alias.replace(/pull(last|next)/gi, 'pull-$1');

        if (next.includes(alias)) {
            week = week.plus({ weeks: 1 });
        } else if (previous.includes(alias)) {
            week = week.minus({ weeks: 1 });
        }

        return message.util.send(await this.run(publisher, week));
    }

    public async interact(interaction: CommandInteraction, { publisher, date }: { publisher: Publisher; date: string }) {
        const parsed: Date = this.handler.resolver.type('parsedDate')(null, date) ?? new Date();
        const day = getPullDate(DateTime.fromJSDate(parsed).setZone('utc'));

        const main = this.client.util.checkEmbed(await this.run(publishers.get(publisher), day));
        return interaction.reply(main);
    }

    private async run(publisher: PublisherData, date: DateTime) {
        const pull = await fetchReleases(date.toFormat(formats.locg), {
            publishers: [publisher.id],
            filter: [
                FilterTypes.Regular,
                FilterTypes.Digital,
                FilterTypes.Annual
            ],
            sort: SortTypes.AlphaAsc
        });

        const week = (publisher.id === 1 ? date.minus({ days: 1 }) : date).toFormat(formats.locg);

        const embed = this.client.util
            .embed()
            .setColor(publisher.color)
            .setTitle(`${publisher.name} Pull List for the Week of ${week}`)
            .setDescription(pull.length ? pull.map(p => p.name).join('\n') : 'No comics for this week (yet).')
            .setThumbnail(publisher.thumbnail);

        return { embed };
    }
}