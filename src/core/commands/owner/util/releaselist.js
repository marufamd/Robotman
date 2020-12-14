const Command = require("../../../classes/Command");
const { sort, Embed, split, parseWebhook } = require("../../../../util");
const { getComics, filterPulls } = require("../../../../util/locg");
const moment = require("moment");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "releaselist",
            description: "Sends weekly releases to release channel",
            group: "owner"
        });
    }

    async run() {
        const { id, token } = parseWebhook((await this.client.util.get()).scheduleWebhook);
        const webhook = await this.client.fetchWebhook(id, token);
        const date = (moment().weekday() <= 2 ? moment().day(2) : moment().day(2).add(7, "days")).format('YYYY-MM-DD');

        try {
            const pulls = sort(filterPulls(await getComics(1, date)));
            const embeds = [];

            for (const pull of pulls) {
                const embed = new Embed("#007af0s")
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