import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, NO_RESULTS_FOUND } from '#util/constants';
import { request } from '#util/request';
import { stripIndents } from 'common-tags';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

interface OpenMovieDatabaseResponse {
	Title: string;
	Year: string;
	Rated: string;
	Released: string;
	Runtime: string;
	Genre: string;
	Director: string;
	Writer: string;
	Actors: string;
	Plot: string;
	Language: string;
	Country: string;
	Awards: string;
	Poster: string;
	Production: string;
	Ratings: Array<{
		Source: string;
		Value: string;
	}>;
	Metascore: string;
	imdbRating: string;
	imdbVotes: string;
	imdbID: string;
	Type: string;
	totalSeasons: string;
	Response: 'True' | 'False';
}

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['movies', 'film', 'films'],
		description: 'Displays information about a movie.',
		usage: '<movie>',
		example: ['Iron Man', 'Space Jam', 'Lion King'],
		args: [
			{
				name: 'query',
				match: 'content',
				prompt: 'What movie would you like to search for?'
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'query',
			description: 'The movie to search for.',
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
		const { body }: { body: OpenMovieDatabaseResponse } = await request.get('https://www.omdbapi.com/').query({
			apikey: process.env.OPEN_MOVIE_DB_KEY,
			type: 'movie',
			t: query.replaceAll(/spider man/gi, 'spider-man')
		});

		if (body.Response === 'False') return NO_RESULTS_FOUND;

		const embed = new Embed()
			.setColor(Colors.OPEN_MOVIE_DB)
			.setTitle(`${body.Title} (${body.Year})`)
			.setThumbnail(body.Poster === 'N/A' ? null : body.Poster)
			.setURL(`https://www.imdb.com/title/${body.imdbID}`)
			.setDescription(
				stripIndents`
                ${body.Plot}
    
                **Genres**: ${body.Genre}
                **Age Rating**: ${body.Rated}
                **Country:** ${body.Country}
                **Runtime:** ${body.Runtime}
    
                **Directed by:** ${body.Director}
                **Credits:** ${body.Writer.replaceAll(' by', '')}
                **Starring:** ${body.Actors}
                **Production Companies:** ${body.Production}`
			)
			.setFooter('Open Movie Database');

		if (body.Ratings?.length) {
			embed.addField('Ratings', body.Ratings.map((r: { Source: string; Value: string }) => `**${r.Source}:** ${r.Value}`).join('\n'));
		}

		return { embeds: [embed] };
	}
}
