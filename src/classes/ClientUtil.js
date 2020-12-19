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
        return new MessageEmbed(data);
    }
};