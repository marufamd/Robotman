import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, DateFormats } from '#util/constants';
import { closest, randomResponse, trim } from '#util/misc';
import type { ReviewEntry } from '#util/wrappers';
import { letterboxd } from '#util/wrappers';
import { chunk } from '@sapphire/utilities';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { DateTime } from 'luxon';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['letterbox'],
		description: 'Displays movie reviews/ratings on a Letterboxd account.',
		extended: 'If no film argument is provided, all films and ratings for an account will be displayed, rather than a specific review',
		usage: '<user> [film]',
		args: [
			{
				name: 'username',
				prompt: "Which user's ratings/reviews would you like to view?"
			},
			{
				name: 'film',
				type: 'lowercase',
				match: 'rest'
			}
		],
		cooldown: 6,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'username',
			description: 'The user to view reviews/ratings for.',
			type: 'STRING',
			required: true
		},
		{
			name: 'film',
			description: 'The film to view the review for.',
			type: 'STRING'
		}
	];

	public async exec(message: Message, { username, film }: { username: string; film: string }) {
		return reply(message, await this.run(username, film));
	}

	public async interact(interaction: CommandInteraction, { username, film }: { username: string; film: string }) {
		return interaction.reply(await this.run(username, film));
	}

	private async run(username: string, film: string) {
		const { user, diaries: list } = await letterboxd(username);

		if (!list) {
			return {
				content: 'That user does not exist.',
				ephemeral: true
			};
		}

		if (!list.length) {
			return {
				content: 'That user does not have any recent reviews.',
				ephemeral: true
			};
		}

		let rating;

		const embed = new Embed()
			.setColor(randomResponse([Colors.LETTERBOXD_BLUE, Colors.LETTERBOXD_GREEN, Colors.LETTERBOXD_ORANGE]))
			.setAuthor('Letterboxd', 'https://i.imgur.com/2nQftA2.png', 'https://letterboxd.com/');

		if (!film || film === 'all') {
			const films = list.map((r) => `[${this.getFilm(r)}](${r.url}) ${r.rating ?? ''}`);
			const chunks = chunk(films, 10).entries();

			for (let [i, chunk] of chunks) {
				embed.addField(`Page ${++i}`, trim(chunk.join('\n'), 1024), true);
			}

			embed.setTitle(`${user}'s Latest Reviews`).setURL(`https://letterboxd.com/${username}/films/reviews/`);
		} else {
			if (['latest', 'recent'].includes(film)) {
				rating = list[0];
			} else {
				film = closest(film, list.map((a) => a.film?.title).filter(Boolean));
				rating = list.find((m) => m.film?.title === film);
			}

			if (!rating) {
				return {
					content: 'Cannot find a recent review for that film.',
					ephemeral: true
				};
			}

			embed
				.setTitle(this.getFilm(rating))
				.setURL(rating.url)
				.setThumbnail(rating.film.image)
				.setFooter(`Review by ${user}`)
				.setTimestamp(rating.published);

			if (!isNaN(rating.watched.getTime())) embed.addField('Watched On', DateTime.fromJSDate(rating.watched).toFormat(DateFormats.REGULAR));

			if (rating.review?.length) {
				let desc = rating.review;
				if (rating.spoiler) {
					desc = desc
						.split('\n')
						.map((d) => `||${d}||`)
						.join('\n');
				}
				embed.setDescription(trim(desc, 2048));
			}

			if (rating.rating) embed.addField('Rating', rating.rating);
		}

		return { embeds: [embed] };
	}

	private getFilm(rating: ReviewEntry) {
		return `${rating.film.title} (${rating.film.year})`;
	}
}
