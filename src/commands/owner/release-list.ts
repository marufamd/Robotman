import { fetchReleases, FilterTypes, SortTypes } from 'comicgeeks';
import { Command } from 'discord-akairo';
import type { Snowflake, TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { split } from '../../util';
import { channels, colors, formats } from '../../util/constants';

export default class extends Command {
    public constructor() {
        super('release-list', {
            aliases: ['release-list'],
            description: 'Sends the release list.',
            ownerOnly: true
        });
    }

    public async exec() {
        const day = DateTime.local();

        const date = day
            .set({ weekday: 2 })
            .plus({ weeks: day.weekday <= 2 ? 0 : 1 })
            .toFormat(formats.locg);

        const channel = this.client.channels.cache.get(channels.NEWS.COMICS as Snowflake) as TextChannel;

        try {
            const pulls = await fetchReleases(date, {
                publishers: ['DC Comics'],
                filter: [
                    FilterTypes.Regular,
                    FilterTypes.Digital,
                    FilterTypes.Annual
                ],
                sort: SortTypes.AlphaAsc
            });
            const embeds = [];

            for (const pull of pulls) {
                const embed = this.client.util
                    .embed()
                    .setColor(colors.DC)
                    .setTitle(pull.name)
                    .setURL(pull.url)
                    .setDescription(pull.description)
                    .setThumbnail(pull.cover)
                    .setFooter(`Cover Price: ${pull.price}`);

                embeds.push(embed);
            }

            const msg = await channel.send(`**__Comics Release List for ${date}__**`);

            for (const chunk of split(embeds, 10)) {
                await channel.send({ embeds: chunk });
            }

            await msg
                .pin()
                .catch(e => this.client.log(`Unable to pin release list message for ${date} in ${channel.toString()}\n${e.stack ?? e}`, 'error'));

            this.client.log(`Release list for ${date} successfully sent to ${channel.toString()}`, 'log');
        } catch (e) {
            this.client.log(
                `Error sending release list for ${date}\n${e.stack ?? e}`,
                'error',
                { ping: true }
            );
        }
    }
}