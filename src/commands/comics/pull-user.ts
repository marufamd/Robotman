import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import type { Message } from 'discord.js';
import { DateTime } from 'luxon';
import Interaction from '../../structures/Interaction';
import locg from '../../util/locg';
import { pull, formats, colors } from '../../util/constants';

const { previous, next } = pull.user;

export default class extends Command {
    public constructor() {
        super('pull-user', {
            aliases: ['pull-user', 'p-u', 'pull-u', 'p-user', previous, next].flat(),
            description: {
                info: 'Gets the pull list for a user on League of Comic Geeks for a specified week.',
                usage: '<locg username> <date>',
                extended: [
                    'To get next week\'s pull list, do `{p}pullnextuser`',
                    'To get last week\'s pull list, do `{p}pulllastuser`\n',
                    'To get the pull list for a different week, you can put the date you want after the username\n',
                    'You can create a LOCG account [here](https://leagueofcomicgeeks.com/)',
                    'Once you have an account, simply subscribe to whatever series\' you are pulling to create a pull list'
                ],
                examples: [
                    'maruf99',
                    'pullnextuser maruf99',
                    'pulllastuser maruf99',
                    'pulluser maruf99 Jan 2 2021'
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
            cooldown: 4e3
        });
    }

    public interactionOptions = {
        name: 'pull-user',
        description: 'Gets the pull list for a user on League of Comic Geeks for a specified week.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'username',
                description: 'The username to view the pull list for.',
                required: true
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'date',
                description: 'The week to view the pull list for.'
            }
        ]
    };

    public async exec(message: Message, { username, date }: { username: string; date: Date }) {
        let week = locg.resolveDate(DateTime.fromJSDate(date).setZone('utc'));

        if (next.includes(message.util.parsed.alias)) week = week.plus({ days: 7 });
        else if (previous.includes(message.util.parsed.alias)) week = week.minus({ days: 7 });

        return message.util.send(await this.main(username, week));
    }

    public async interact(interaction: Interaction) {
        const [username, date] = interaction.findOptions('username', 'date'); // eslint-disable-line prefer-const

        const parsed: Date = this.handler.resolver.type('parsedDate')(null, date) ?? new Date();
        const week = locg.resolveDate(DateTime.fromJSDate(parsed).setZone('utc'));

        return interaction.respond(await this.main(username, week));
    }

    private async main(username: string, date: DateTime) {
        const week = date.toFormat(formats.locg);

        const user = await locg.resolveUser(username);
        if (!user) return { content: 'That account is private or does not exist.', type: 'message', ephemeral: true };

        const pulls = await locg.getPulls(user.id, week);
        const prices = pulls.length ? pulls.map(p => Number(p.price.replaceAll('$', ''))).reduce((a, b) => a + b).toFixed(2) : null;

        const embed = this.client.util.embed()
            .setColor(colors.LOCG)
            .setAuthor('League of Comic Geeks', 'https://leagueofcomicgeeks.com/assets/images/user-menu-logo-icon.png', locg.url)
            .setTitle(`${user.name}'s Pull List for the Week of ${week}`)
            .setURL(user.url)
            .setDescription(pulls.length ? pulls.map(p => p.name).join('\n') : 'No pulls for this week');

        if (prices) embed.addField('Total', `$${prices} USD`);

        return embed;
    }
}