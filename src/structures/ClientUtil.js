const { ClientUtil } = require('discord-akairo');
const { MessageEmbed } = require('discord.js');
const { botColors } = require('../util/constants');

module.exports = class extends ClientUtil {
    constructor(client) {
        super(client);
    }

    embed(data) {
        if (typeof data !== 'object' || data === null) data = {};
        if (typeof data.color === 'undefined') data.color = botColors.main;
        return new Embed(data);
    }
};

class Embed extends MessageEmbed {
    constructor(data) {
        super(data);
    }

    formatFields() {
        if ([5, 8, 11, 14, 17, 20, 23, 26].includes(this.fields.length)) this.addField('\u200b', '\u200b', true);
        return this;
    }
}