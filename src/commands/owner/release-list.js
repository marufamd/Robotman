const { Command } = require('discord-akairo');
const moment = require('moment');
const { split, parseWebhook } = require('../../util');
const { colors, formats } = require('../../util/constants');
const { getComics } = require('../../util/locg');

module.exports = class extends Command {
    constructor() {
        super('release-list', {
            aliases: ['release-list'],
            description: 'Displays the release list.'
        });
    }

    async exec() {
        const { webhook_url } = await this.client.config.get();
        if (!webhook_url) return;

        const { id, token } = parseWebhook(webhook_url);
        const webhook = await this.client.fetchWebhook(id, token);
        const date = (moment().weekday() <= 2 ? moment().day(2) : moment().day(2).add(7, "days")).format(formats.locg);

        try {
            const pulls = await getComics(1, date);
            const embeds = [];

            for (const pull of pulls) {
                const embed = this.client.util.embed()
                    .setColor(colors.DC)
                    .setTitle(pull.name)
                    .setURL(pull.link)
                    .setDescription(pull.description)
                    .setThumbnail(pull.cover)
                    .setFooter(`Cover Price: ${pull.price}`);

                embeds.push(embed);
            }

            const msg = await webhook.send(`**__Comics Release List for ${date}__**`);

            if (embeds.length > 10) {
                const newEmbeds = split(embeds, 10);
                for (const embedChunk of newEmbeds) await webhook.send({ embeds: embedChunk });
            } else {
                await webhook.send({ embeds });
            }

            msg.pin();

            this.client.log(`Release list for ${date} successfully sent to ${msg.channel.toString()}`, "log");
        } catch (e) {
            this.client.log(`Error sending release list for ${date}\n${e.stack}`, "error", { ping: true });
        }
    }
};