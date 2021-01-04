const { Command } = require('discord-akairo');
const { DateTime } = require('luxon');
const { pull: { user: { previous, next } }, formats, colors } = require('../../util/constants');
const { getPulls, resolveUser, resolveDate } = require('../../util/locg');

module.exports = class extends Command {
    constructor() {
        super('pulluser', {
            aliases: ['pull-user', 'p-u', 'pull-u', 'p-user', previous, next].flat(),
            description: {
                info: 'Gets the pull list for a user on League of Comic Geeks for a specified week.',
                usage: '<locg username> <date>',
                extended: [
                    'To get next week\'s pull list, do `{p}pullnextuser`',
                    'To get last week\'s pull list, do `{p}pulllastuser`\n',
                    'To get the pull list for a different week, you can put the date you want after the username\n',
                    "You can create a LOCG account [here](https://leagueofcomicgeeks.com/)",
                    'Once you have an account, simply subscribe to whatever series\' you are pulling to create a pull list'
                ],
                examples: [
                    "maruf99",
                    "pullnextuser maruf99",
                    "pulllastuser maruf99",
                    "pulluser maruf99 Jan 2 2021"
                ]
            },
            args: [
                {
                    id: 'username',
                    type: 'string',
                    prompt: {
                        start: 'Which user\'s pull list would you like to view?'
                    }
                },
                {
                    id: 'date',
                    type: 'parsedDate',
                    match: 'rest',
                    default: new Date()
                }
            ],
            typing: true,
            cooldown: 4
        });
    }

    interactionOptions = {
        name: 'pull-user',
        description: 'Gets the pull list for a user on League of Comic Geeks for a specified week.',
        options: [
            {
                type: 'string',
                name: 'username',
                description: 'The username to view the pull list for.',
                required: true
            },
            {
                type: 'string',
                name: 'date',
                description: 'The week to view the pull list for.'
            }
        ]
    }

    async exec(message, { username, date }) {
        date = resolveDate(DateTime.fromJSDate(date).setZone('utc'));

        if (next.includes(message.util.parsed.alias)) date = date.plus({ days: 7 });
        else if (previous.includes(message.util.parsed.alias)) date = date.minus({ days: 7 });

        return message.util.send(await this.main(username, date));
    }

    async interact(interaction) {
        let [username, date] = interaction.findOptions('username', 'date'); // eslint-disable-line prefer-const
        
        const parsed = this.handler.resolver.type('parsedDate')(null, date) ?? new Date();
        date = resolveDate(DateTime.fromJSDate(parsed).setZone('utc'));

        return interaction.respond(await this.main(username, date));
    }

    async main(username, date) {
        date = date.toFormat(formats.locg);

        const user = await resolveUser(username);
        if (!user || user === 'private') return { content: 'That account is private or does not exist.', type: 'message', ephemeral: true };

        const pulls = await getPulls(user.id, date);
        const prices = pulls.length ? pulls.map(p => Number(p.price.replaceAll("$", ""))).reduce((a, b) => a + b).toFixed(2) : null;

        const embed = this.client.util.embed()
            .setColor(colors.LOCG)
            .setTitle(`${user.name}'s Pull List for the Week of ${date}`)
            .setURL(user.url)
            .setDescription(pulls.length ? pulls.map(p => p.name).join('\n') : 'No pulls for this week')
            .setFooter("League of Comic Geeks", "https://leagueofcomicgeeks.com/assets/images/user-menu-logo-icon.png");

        if (prices) embed.addField('Total', `$${prices} USD`);

        return embed;
    }
};