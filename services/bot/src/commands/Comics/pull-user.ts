import { resolveArgument } from '#util/arguments';
import { Embed } from '#util/builders';
import type { Command, CommandOptions, MessageContext } from '#util/commands';
import { Colors, DateFormats, Pull } from '#util/constants';
import { getPullDate } from '#util/misc';
import { reply } from '@skyra/editable-commands';
import type { User } from 'comicgeeks';
import { BASE_URL, fetchPulls, fetchUser, SortTypes } from 'comicgeeks';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

const { PREVIOUS, NEXT } = Pull.USER;

const userCache = new Map<string, User>();

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['pu', 'puser', PREVIOUS, NEXT].flat(),
		description: 'Gets the pull list for a user on League of Comic Geeks for a specified week.',
		extended: [
			`To get next week's pull list, do \`${process.env.BOT_PREFIX}pullnextuser\``,
			`To get last week's pull list, do \`${process.env.BOT_PREFIX}pulllastuser\`\n`,
			'To get the pull list for a different week, you can put the date you want after the username\n',
			`You can create a LOCG account [here](${BASE_URL})`,
			"Once you have an account, simply subscribe to whatever series' you are pulling to create a pull list"
		],
		usage: '<locg username> [date]',
		example: ['maruf99', 'pullnextuser maruf99', 'pulllastuser maruf99', 'pulluser maruf99 Jan 2 2021'],
		args: [
			{
				name: 'username',
				type: 'lowercase',
				prompt: "Which user's pull list would you like to view?"
			},
			{
				name: 'date',
				type: 'date',
				match: 'rest',
				default: () => new Date()
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'user',
			description: 'The user to view the pull list for.',
			type: 'STRING',
			required: true
		},
		{
			name: 'date',
			description: 'The week to view the pull list for.',
			type: 'STRING'
		}
	];

	public async exec(message: Message, { username, date }: { username: string; date: Date }, context: MessageContext) {
		let week = getPullDate(dayjs(date));

		const alias = context.alias.replace(/pull(last|next)user/gi, 'pull-$1-user');

		if (NEXT.includes(alias)) {
			week = week.add(7, 'day');
		} else if (PREVIOUS.includes(alias)) {
			week = week.subtract(7, 'day');
		}

		return reply(message, await this.run(username, week));
	}

	public async interact(interaction: CommandInteraction, { user, date }: { user: string; date: string }) {
		const parsed = resolveArgument(date, 'date') ?? new Date();
		const week = getPullDate(dayjs(parsed));

		return interaction.reply(await this.run(user.toLowerCase(), week));
	}

	private async run(username: string, date: Dayjs) {
		const user = userCache.get(username) ?? (await fetchUser(username).catch(() => null));

		if (!user) {
			return {
				content: 'That user does not exist.',
				ephemeral: true
			};
		}

		if (!userCache.has(user.name)) userCache.set(user.name, user);

		const week = date.format(DateFormats.LOCG);

		const pulls = await fetchPulls(user.id, week, { sort: SortTypes.AlphaAsc });
		const prices = pulls.length
			? pulls
					.map((p) => Number(p.price.replaceAll('$', '')))
					.reduce((a, b) => a + b)
					.toFixed(2)
			: null;

		const embed = new Embed()
			.setColor(Colors.LOCG)
			.setAuthor(`${user.name}'s Pull List for the Week of ${week}`, user.avatar, `${user.url}/pull-list`)
			.setDescription(pulls.length ? pulls.map((p) => p.name).join('\n') : 'No pulls for this week')
			.setFooter('League of Comic Geeks', `${BASE_URL}/assets/images/user-menu-logo-icon.png`);

		if (prices) embed.addField('Total', `$${prices} USD`);

		return { embeds: [embed] };
	}
}
