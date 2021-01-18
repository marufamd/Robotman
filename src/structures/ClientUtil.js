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
        if (!command?.description) return null;
        return typeof command.description !== 'string' ? command.description.info : command.description;
    }

    getExtended(command, prefix) {
        if (!command?.description?.extended?.length) return this.getDescription(command);
        return `${command.description.info}\n\n${command.description.extended.join('\n').replaceAll('{p}', prefix)}`;
    }

    formatPrefix(message) {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util.parsed.prefix) ? `@${message.client.user.tag} ` : message.util.parsed.prefix;
    }

    formatExamples(command, prefix) {
        return command.description.examples
            .map(e => {
                if (command.aliases.some(a => e.startsWith(a + ' '))) return `${prefix}${e}`;
                return `${prefix}${command.id} ${e}`;
            })
            .join('\n');
    }

    getPrefix(message) {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util?.parsed?.prefix) ? `@${message.client.user.tag} ` : (message.util?.parsed?.prefix ?? process.env.CLIENT_PREFIX);
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