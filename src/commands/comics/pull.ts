import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import type { Message } from 'discord.js';
import { DateTime } from 'luxon';
import Interaction from '../../structures/Interaction';
import locg from '../../util/locg';
import { publishers, pull, formats, Publisher } from '../../util/constants';

const { previous, next } = pull.default;

export default class extends Command {
    public constructor() {
        super('pull', {
            aliases: ['pull', 'p', 'releases', previous, next].flat(),
            description: {
                info: 'Gets the pull list for a publisher for a specified week. Defaults to DC.',
                usage: '<publisher> [date]',
                extended: [
                    'To get next week\'s pull list, do `{p}pullnext`',
                    'To get last week\'s pull list, do `{p}pulllast`',
                    'To get the pull list for a different week, you can put the date you want after the publisher\n',
                    `Publisher codes are in codeblocks:\n\n${Object.entries(publishers).map(c => `${c[1].name} \`${c[0]}\``).join('\n')}`
                ],
                examples: [
                    'dc',
                    'pulllast marvel',
                    'pullnext archie',
                    'idw December 2 2020',
                    'darkhorse 17 Jan 2021',
                    'boom 2021-02-13'
                ]
            },
            args: [
                {
                    id: 'publisher',
                    type: Object.keys(publishers),
                    default: 'dc'
                },
                {
                    id: 'date',
                    type: 'parsedDate',
                    match: 'rest',
                    default: new Date()
                }
            ],
            typing: true
        });
    }

    public interactionOptions = {
        name: 'pull',
        description: 'Gets the pull list for a publisher for a specified week.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'publisher',
                description: 'The publisher to view the pull list for.',
                choices: Object.entries(publishers).map(([value, { name }]) => ({ name, value })).slice(0, 10),
                required: true
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'date',
                description: 'The week to view the pull list for.'
            }
        ]
    };

    public async exec(message: Message, { publisher, date }: { publisher: Publisher; date: Date }) {
        let week = locg.resolveDate(DateTime.fromJSDate(date).setZone('utc'));

        if (next.includes(message.util.parsed.alias)) week = week.plus({ weeks: 1 });
        else if (previous.includes(message.util.parsed.alias)) week = week.minus({ weeks: 1 });

        return message.util.send(await this.main(publisher, week));
    }

    public async interact(interaction: Interaction) {
        const [publisher, date] = interaction.findOptions('publisher', 'date');

        const parsed: Date = this.handler.resolver.type('parsedDate')(null, date) ?? new Date();
        const day = locg.resolveDate(DateTime.fromJSDate(parsed).setZone('utc'));

        return interaction.respond(await this.main(publisher, day));
    }

    private async main(pub: Publisher, date: DateTime) {
        const publisher = publishers[pub];

        const pull = await locg.getComics(publisher.id, date.toFormat(formats.locg));

        const week = (publisher.id === 1 ? date.minus({ days: 1 }) : date).toFormat(formats.locg);

        const embed = this.client.util
            .embed()
            .setColor(publisher.color)
            .setTitle(`${publisher.name} Pull List for the Week of ${week}`)
            .setDescription(pull.length ? pull.map(p => p.name).join('\n') : 'No comics for this week (yet).')
            .setThumbnail(publisher.thumbnail);

        return embed;
    }
}