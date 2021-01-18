const { emojis: { paginator: emojis } } = require('../util/constants');

module.exports = class Paginator {
    constructor({ embeds = [], time = 30000 }) {
        this.embeds = embeds;
        this.time = time;
        this.page = 0;
    }

    addEmbed(embed) {
        if (!embed || typeof embed !== 'object') throw new Error('No Embed provided.');
        this.embeds.push(embed);
        return this;
    }

    setTime(time) {
        if (typeof time === 'string') time = parseInt(time);
        if (isNaN(time)) throw new Error('Invalid time.');
        this.time = time;
        return this;
    }

    async send(message) {
        const msg = await message.util.send(this.embeds[0]);
        for (const emoji of emojis) await msg.react(emoji);

        const filter = ({ emoji }, u) => message.author.id === u.id && emojis.includes(emoji.id);
        const collector = msg.createReactionCollector(filter, { time: this.time });

        collector.on('collect', ({ emoji }, u) => {            
            switch (emojis.indexOf(emoji.id)) {
                case 0: // First Page
                    if (this.page > 0) msg.edit(this.embeds[0]);
                    this.page = 0;
                    break;
                case 1: // Previous Page
                    if (this.embeds[this.page - 1]) msg.edit(this.embeds[this.page - 1]);
                    this.page--;
                    break;
                case 2: // Next Page
                    if (this.embeds[this.page + 1]) msg.edit(this.embeds[this.page + 1]);
                    this.page++;
                    break;
                case 3: // Last Page
                    if (this.page < (this.embeds.length - 1)) msg.edit(this.embeds[this.embeds.length - 1]);
                    this.page = this.embeds.length - 1;
                    break;
                case 4: // Stop
                    collector.stop();
                    break;
            }

            msg.reactions.cache.get(emoji.id).users.remove(u.id);
        });

        collector.on('end', () => msg.reactions.removeAll());

        return msg;
    }
};