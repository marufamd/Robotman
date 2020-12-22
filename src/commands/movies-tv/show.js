const { Command } = require('discord-akairo');
const TurndownService = require('turndown');
const { fetch } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('show', {
            aliases: ['show', "tv", "tv-show"],
            description: {
                info: 'Displays info about a TV show.',
                usage: '<query>',
                examples: ['Daredevil'],
            },
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What show would you like to search for?'
                    }
                }
            ],
        });
    }

    async exec(message, { query }) {
        const res = await fetch("https://api.tvmaze.com/search/shows", { q: query });
        if (!res?.length) return message.util.send("No results found.");

        const { show } = res[0];
        const network = show.network || show.webChannel;

        const embed = this.client.util.embed()
            .setColor("43958b")
            .setTitle(show.name)
            .setURL(show.url)
            .setDescription(new TurndownService().turndown(show.summary))
            .setThumbnail(show.image.original)
            .addField("Language", show.language, true)
            .addField("Premiered", show.premiered, true)
            .addField("Status", show.status, true)
            .addField("Genres", show.genres.join(", "), true)
            .setFooter("TVmaze", "https://i.imgur.com/ExggnTB.png");

        if (network) embed.addField("Network", network.name, true);
        if (show.officialSite) embed.addField("Website", `[Click Here](${show.officialSite})`, true);
        if (embed.fields.length === 5) embed.addField("\u200b", "\u200b", true);

        return message.util.send(embed);
    }
};