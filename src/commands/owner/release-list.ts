import { fetchReleases, FilterTypes, SortTypes } from 'comicgeeks';
import { Command } from 'discord-akairo';
import type { Message, Snowflake } from 'discord.js';
import { DateTime } from 'luxon';
import { parseWebhook, split } from '../../util';
import { colors, formats } from '../../util/constants';

export default class extends Command {
    public constructor() {
        super('release-list', {
            aliases: ['release-list'],
            description: 'Sends the release list.',
            ownerOnly: true
        });
    }

    public async exec() {
        const webhookURL = await this.client.config.get('webhook_url');
        if (!webhookURL?.length) return;

        const day = DateTime.local();

        const { id, token } = parseWebhook(webhookURL);
        const webhook = await this.client.fetchWebhook(id as Snowflake, token);
        const date = day
            .set({ weekday: 2 })
            .plus({ weeks: day.weekday <= 2 ? 0 : 1 })
            .toFormat(formats.locg);

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

            const msg = await webhook.send(`**__Comics Release List for ${date}__**`) as Message;

            if (embeds.length > 10) {
                const newEmbeds = split(embeds, 10);
                for (const embedChunk of newEmbeds) await webhook.send({ embeds: embedChunk });
            } else {
                await webhook.send({ embeds });
            }

            void msg.pin();

            this.client.log(`Release list for ${date} successfully sent to ${msg.channel.toString()}`, 'log');
        } catch (e) {
            this.client.log(`Error sending release list for ${date}\n${e.stack}`, 'error', { ping: true });
        }
    }
}