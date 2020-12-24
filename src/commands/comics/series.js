const { Command } = require('discord-akairo');
const { search } = require('../../util/locg');
const { MAX_SEARCH_RESULTS, colors } = require('../../util/constants');
const { split } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('series', {
            aliases: ['series', 'locg-search', 'comic-search', 'series-search'],
            description: {
                info: 'Searches League of Comic Geeks for a series.',
                usage: '<query>',
                examples: ["batman", "daredevil", "stillwater"],
            },
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                }
            ],
            typing: true,
            ratelimit: 5
        });
    }

    async exec(message, { query }) {
        const results = await search(query);
        if (!results.length) return message.util.send('No results found.');

        let num = MAX_SEARCH_RESULTS;
        const half = num / 2;
        if (results.length < MAX_SEARCH_RESULTS) num = results.length;

        let formatted = [];

        for (let i = 0; i < num; i++) {
            const result = results[i];
            const str = `**[${result.name}](${result.link})**\n${result.publisher} | [Cover](${result.cover})`;
            formatted.push(str);
        }

        if (formatted.length > half) formatted = split(formatted, half);
        else formatted = [formatted];

        const [page1, page2] = formatted;

        const embed = this.client.util.embed()
            .setColor(colors.LOCG)
            .setTitle(`Top results for "${query}"`)
            .setURL(`https://leagueofcomicgeeks.com/search?keyword=${encodeURIComponent(query)}`)
            .addField("Page 1", page1.join("\n"), true)
            .setThumbnail(results[0].cover)
            .setFooter("League of Comic Geeks", "https://leagueofcomicgeeks.com/assets/images/user-menu-logo-icon.png");

        if (page2 && page2.length) embed.addField("Page 2", page2.join("\n"), true);
        
        return message.util.send(embed);
    }
};