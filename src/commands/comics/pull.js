const { Command } = require('discord-akairo');
const moment = require('moment');
const { pull: { default: { previous, next } }, publishers, formats } = require('../../util/constants');
const { getComics } = require('../../util/locg');

module.exports = class extends Command {
    constructor() {
        super('pull', {
            aliases: ['pull', 'p', 'releases', previous, next].flat(),
            description: {
                info: 'Gets the pull list for a publisher for a specified week. Defaults to DC.',
                usage: '<publisher> <date>',
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
        date = date ? moment(date).day(3) : (moment().weekday() <= 3 ? moment().day(3) : moment().day(3).add(7, 'days'));

        if (next.includes(message.util.parsed.alias)) date = date.add(7, 'days');
        else if (previous.includes(message.util.parsed.alias)) date = date.subtract(7, 'days');

        return message.util.send(await this.main(publisher, date));
    }

    async interact(interaction) {
        let [publisher, date] = interaction.findOptions('publisher', 'date'); // eslint-disable-line prefer-const

        const newDate = moment();
        const parsed = this.handler.resolver.type('parsedDate')(null, date);

        if (date === 'next') date = newDate.add(7, 'days');
        else if (date === 'last') date = newDate.subtract(7, 'days');
        else if (parsed) date = moment(parsed);
        else date = newDate;

        date = (date !== newDate) || (date.weekday() <= 3) ? date.day(3) : date.day(3).add(7, 'days');

        return interaction.respond(await this.main(publisher, date));
    }

    async main(publisher, date) {
        publisher = publishers[publisher];

        const pull = await getComics(publisher.id, date.format(formats.locg));

        date = (publisher.id === 1 ? date.subtract(1, 'days') : date).format(formats.locg);

        const embed = this.client.util.embed()
            .setColor(publisher.color)
            .setTitle(`${publisher.name} Pull List for the Week of ${date}`)
            .setDescription(pull.length ? pull.map(p => p.name).join('\n') : 'No comics for this week (yet).')
            .setThumbnail(publisher.thumbnail);
        
        return embed;
    }
};