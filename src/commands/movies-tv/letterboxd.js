const { Command } = require('discord-akairo');
const letterboxd = require('letterboxd');
const { randomResponse } = require('../../util');

const COLORS = [
    16087596,
    5029107,
    3334244
];

module.exports = class extends Command {
    constructor() {
        super('letterboxd', {
            aliases: ['letterboxd', 'letterbox'],
            description: {
                info: 'Shows movie reviews on a letterboxd account.',
                usage: '<user> <film>'
            },
            args: [
                {
                    id: 'username',
                    prompt: {
                        start: 'What is the name of the account you\'d like to view?'
                    }
                },
                {
                    id: 'film',
                    type: 'lowercase'
                }
            ],
            cooldown: 7e3,
            typing: true
        });
    }

    async exec(message, { username, film }) {
        try {
            const list = await letterboxd(username);
            if (!list?.length) return message.util.send('That user does not have any reviews.');

            let rating;

            if (!film || ['latest', 'recent'].includes(film)) rating = list[0];
            else rating = list.find(m => m.film?.title?.toLowerCase?.() === film);

            if (!rating) return message.util.send('Cannot find a recent review for that film.');

            const embed = this.client.util.embed()
                .setColor(randomResponse(COLORS))
                .setTitle(`${rating.film.title} (${rating.film.year})`)
                .setURL(rating.url)
                .setDescription(rating.review ?? null)
                .setThumbnail(rating.film.image.tiny)
                .setFooter(`Review by ${username}`)
                .setTimestamp(rating.date?.published);

            if (rating.rating?.text) embed.addField('Rating', rating.rating.text);

            return message.util.send(embed);
        } catch {
            return message.util.send('That user does not exist.');
        }
    }
};