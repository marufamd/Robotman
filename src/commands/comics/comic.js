const cheerio = require('cheerio');
const { Command } = require('discord-akairo');
const { google, trim, fetch, title } = require('../../util');
const { colors: { COMIXOLOGY } } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('comic', {
            aliases: ['comic', 'comixology', 'issue', 'trade'],
            description: {
                info: 'Searches ComiXology for an issue/trade',
                usage: '<query>',
                extended: ['More specific queries will give a more accurate result (e.g. including the launch year of the book, the writer, etc)'],
                examples: [
                    'daredevil 1 zdarsky',
                    'batman 50'
                ]
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
            cooldown: 10
        });
    }

    interactionOptions = {
        name: 'comic',
        description: 'Searches ComiXology for an issue/trade.',
        options: [
            {
                type: 'string',
                name: 'query',
                description: 'The issue/trade to search for.',
                required: true
            }
        ]
    }

    async exec(message, { query }) {
        return message.util.send(await this.main(query));
    }

    async interact(interaction) {
        return interaction.respond(await this.main(interaction.option('query')));
    }

    async main(query) {
        const comic = await this.search(query);
        if (!comic) return { content: 'No results found.', type: 'message', ephemeral: true };

        const embed = this.client.util.embed()
            .setColor(COMIXOLOGY)
            .setAuthor(comic.publisher.name, comic.publisher.image)
            .setTitle(comic.name)
            .setURL(comic.url)
            .setDescription(trim(comic.description, 2048))
            .setThumbnail(comic.cover)
            .setFooter('ComiXology', 'https://i.imgur.com/w8RoAMX.png');

        for (const [name, credits] of Object.entries(comic.credits)) {
            if (credits.length) embed.addField(`${title(name)} By`, credits.join('\n'), true);
        }

        const { releaseDate, pageCount } = comic;

        if (pageCount) embed.addField('Page Count', pageCount, true);
        if (releaseDate) embed.addField('Release Date', releaseDate, true);

        return embed.inlineFields();
    }

    async search(query) {
        const res = await google(`site:https://comixology.com/ ${query}`);
        if (!res) return null;

        const found = res.items.find(i => i.link.includes('digital-comic'));
        if (!found) return null;

        const link = found.link.replace('https://m.', 'https://www.');
        const body = await fetch(link, null, 'text');

        const $ = cheerio.load(body);
        if (!$('img.icon').length) return null;

        const credits = $('div.credits')[0];

        const findData = type => $(credits).find(`h2[title='${type}']`).map(function () { return $(this).find('a').text().trim(); }).get();

        const written = findData('Written by');
        const art = findData('Art by');
        const pencils = findData('Pencils');
        const inks = findData('Inks');
        const colors = findData('Colored by');
        const cover = findData('Cover by');

        const otherDetails = $('div.aboutText');
        const pageCount = otherDetails.get(0).children[0].data;
        const releaseDate = otherDetails.get(1).children[0].data;

        return {
            publisher: { name: $('h3.name').text(), image: $('img.icon')[1].attribs['src'] },
            name: $('h1.title').text(),
            description: $('.item-description').text(),
            cover: encodeURI($('img.cover')[0].attribs['src']).replace('%', ''),
            url: link,
            credits: { written, art, pencils, inks, colors, cover },
            pageCount,
            releaseDate
        };
    }
};