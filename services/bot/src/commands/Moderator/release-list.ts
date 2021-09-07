import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Channels, Colors, DateFormats } from '#util/constants';
import { log } from '#util/logger';
import { chunk } from '#util/misc';
import { fetchReleases, FilterTypes, SortTypes } from 'comicgeeks';
import dayjs from 'dayjs';
import type { TextChannel } from 'discord.js';
import { Client } from 'discord.js';
import { injectable } from 'tsyringe';

@injectable()
export default class implements Command {
	public constructor(private readonly client: Client) {}

	public options: CommandOptions = {
		description: 'Sends the weekly release list.',
		mod: true
	};

	public async exec() {
		const day = dayjs();

		const date = day
			.set('day', 2)
			.add(day.day() <= 2 ? 0 : 1, 'week')
			.format(DateFormats.LOCG);

		const channel = this.client.channels.cache.get(Channels.NEWS.COMICS) as TextChannel;

		try {
			const pulls = await fetchReleases(date, {
				publishers: ['DC Comics'],
				filter: [FilterTypes.Regular, FilterTypes.Digital, FilterTypes.Annual],
				sort: SortTypes.AlphaAsc
			});

			const embeds = [];

			for (const pull of pulls) {
				const embed = new Embed()
					.setColor(Colors.DC)
					.setTitle(pull.name)
					.setURL(pull.url)
					.setDescription(pull.description)
					.setThumbnail(pull.cover)
					.setFooter(`Cover Price: ${pull.price}`);

				embeds.push(embed);
			}

			const msg = await channel.send(`**__Comics Release List for ${date}__**`);

			for (const embedChunk of chunk(embeds, 10)) {
				await channel.send({ embeds: embedChunk });
			}

			await msg.pin().catch((e) => log(`Unable to pin release list message for ${date} in ${channel.toString()}\n${e.stack ?? e}`, 'error'));

			log(`Release list for ${date} successfully sent to ${channel.toString()}`);
		} catch (e: any) {
			log(`Error sending release list for ${date}\n${e.stack ?? e}`, 'error', { ping: true });
		}
	}
}
