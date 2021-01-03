const { Command } = require('discord-akairo');
const { DateTime } = require('luxon');
const { pull: { default: { previous, next } }, publishers, formats } = require('../../util/constants');
const { getComics } = require('../../util/locg');

module.exports = class extends Command {
    constructor() {
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
                    match: 'rest'
                }
            ],
            typing: true
        });
    }

    interactionOptions = {
        name: 'pull',
        description: 'Gets the pull list for a publisher for a specified week.',
        options: [
            {
                type: 'string',
                name: 'publisher',
                description: 'The publisher to view the pull list for.',
                choices: Object.entries(publishers).map(([k, v]) => ({ name: v.name, value: k })).slice(0, 10),
                required: true
            },
            {
                type: 'string',
                name: 'date',
                description: 'The week to view the pull list for.'
            }
        ]
    }

    async exec(message, { publisher, date }) {
        const day = DateTime.fromJSDate(date ?? new Date());
        date = (!date && day.weekday <= 3 ? day.set({ weekday: 3 }) : day.set({ weekday: 3 }).plus({ days: 7 }));

        if (next.includes(message.util.parsed.alias)) date = date.plus({ days: 7 });
        else if (previous.includes(message.util.parsed.alias)) date = date.minus({ days: 7 });

        return message.util.send(await this.main(publisher, date));
    }

    async interact(interaction) {
        let [publisher, date] = interaction.findOptions('publisher', 'date'); // eslint-disable-line prefer-const

        const parsed = this.handler.resolver.type('parsedDate')(null, date);

        const day = DateTime.fromJSDate(parsed ?? new Date());
        date = (!date && day.weekday <= 3 ? day.set({ weekday: 3 }) : day.set({ weekday: 3 }).plus({ days: 7 }));

        return interaction.respond(await this.main(publisher, date));
    }

    async main(publisher, date) {
        publisher = publishers[publisher];

        const pull = await getComics(publisher.id, date.toFormat(formats.locg));

        date = (publisher.id === 1 ? date.minus({ days: 1 }) : date).toFormat(formats.locg);

        const embed = this.client.util.embed()
            .setColor(publisher.color)
            .setTitle(`${publisher.name} Pull List for the Week of ${date}`)
            .setDescription(pull.length ? pull.map(p => p.name).join('\n') : 'No comics for this week (yet).')
            .setThumbnail(publisher.thumbnail);
        
        return embed;
    }
};