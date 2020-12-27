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

    getDescription(command) {
        return typeof command.description !== 'string' ? command.description.info : command.description;
    }

    formatPrefix(message) {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util.parsed.prefix) ? `@${message.client.user.tag} ` : message.util.parsed.prefix;
    }

    formatUsage(command) {
        if (!command.args?.length) return;
    }

    formatExamples(command, prefix) {
        return command.description.examples
            .map(example => {
                if (command.aliases.some(a => example.startsWith(a + ' '))) return `${prefix}${example}`;
                return `${prefix}${command.id} ${example}`;
            })
            .join('\n');
    }
};

class Embed extends MessageEmbed {
    constructor(data) {
        super(data);
    }

    formatFields() {
        return this.inlineFields();
    }

    inlineFields() {
        if ([5, 8, 11, 14, 17, 20, 23, 26].includes(this.fields.length)) this.addField('\u200b', '\u200b', true);
        return this;
    }
}