import type { Command, CommandOptions } from '#util/commands';
import { DateFormats, Links, Shows } from '#util/constants';
import { pad } from '#util/misc';
import { request } from '#util/request';
import { paste } from '#util/wrappers';
import { reply } from '@skyra/editable-commands';
import { oneLineTrim, stripIndents } from 'common-tags';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { Message } from 'discord.js';
import { MessageActionRow, MessageButton } from 'discord.js';
import TurndownService from 'turndown';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['shows'],
		usage: '[date]',
		args: [
			{
				name: 'date',
				type: 'date',
				match: 'content',
				default: () => new Date()
			}
		],
		mod: true,
		typing: true
	};

	public async exec(message: Message, { date }: { date: Date }) {
		const baseDate = dayjs(date);

		const firstDay = baseDate.set('day', 1).format(DateFormats.LOCG);

		const data = await Promise.all([this.getScheduled(baseDate), this.getScheduled(baseDate, true)]);
		const templates = data.flat();

		if (!templates.length) return message.channel.send(`There are no episodes scheduled for the week of ${firstDay}`);

		const str = `Episode comments for the week of ${firstDay}`;

		const link = await paste(templates.join(`\n`), str, 'markdown');

		return reply(message, {
			content: str,
			components: [new MessageActionRow().addComponents(new MessageButton().setLabel('Comment Templates').setStyle('LINK').setURL(link))]
		});
	}

	private async getScheduled(week: Dayjs, streaming = false) {
		const final = [];

		for (let i = 1; i < 8; i++) {
			const date = week.set('day', i).format(DateFormats.LOCG);

			const { body } = await request.get(`${Links.TV_MAZE}/schedule${streaming ? '/web' : ''}`).query({ country: 'US', date });

			const found = body.filter((e: Record<string, any>) => {
				if (streaming) {
					return Shows.has(e._embedded.show.id);
				}

				return Shows.has(e.show.id);
			});

			if (!found.length) continue;

			for (const episode of found) {
				if (episode.number === null) continue;

				const day = dayjs(new Date(episode.airdate));

				const season = pad(episode.season);
				const number = pad(episode.number);

				const show = streaming ? episode._embedded.show : episode.show;

				const part = (str = '') => `[***${show.name}*** **S${season}E${number}** - *${episode.name}*](${str})`;

				const template = oneLineTrim`
                \\n\\nTime/Date: ${day.format(DateFormats.TEMPLATE)}${streaming ? '' : ` ${this.convertTime(episode.airtime)} ET`}
                \\n\\nNetwork/Channel: ${(show.network ?? show.webChannel)?.name}
				${episode.summary?.length ? `\\n\\n${this.makeSynopsis(episode.summary)}` : ''}
                `;

				final.push(
					stripIndents`
                        ${part(show.image.original)}
                        ${template}`
				);
			}
		}

		return final;
	}

	private convertTime(time: string): string {
		return new Date(`1970-01-01T${time}Z`)
			.toLocaleTimeString([], {
				timeZone: 'UTC',
				hour12: true,
				hour: 'numeric',
				minute: 'numeric'
			})
			.toUpperCase()
			.replaceAll('.', '');
	}

	private makeSynopsis(str: string): string {
		return new TurndownService()
			.turndown(str)
			.split('\n')
			.map((s) => `> ${s}`)
			.join('\\n');
	}
}
