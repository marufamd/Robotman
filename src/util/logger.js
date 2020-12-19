const moment = require('moment-timezone');
const { gray, bold } = require('chalk');
const { WebhookClient } = require('discord.js');

const development = process.env.NODE_ENV === 'development';
const ownerID = process.env.OWNER;
const { id, token } = require('./').parseWebhook(process.env.WEBHOOK_URL);
const { logTypes, botColors, formats } = require('./constants');

const logger = new WebhookClient(id, token);

module.exports = class Logger {
    static log(text, type = 'log', { logToWebhook = true, ping = false } = {}) {
        if (Array.isArray(text)) text = text.join('\n');
        if (!logTypes[type.toLowerCase()]) type = 'log';

        Logger.write(text.replaceAll(/(```(\w+)?|`|\*|__|~~)/g, ''), type);
        if (logToWebhook && id && token) Logger.webhook(text, type, ping);
    }

    static write(text, type = 'log') {
        return console[type](
            gray(`[${moment().format(formats.log)}] `),
            bold[logTypes[type].name](text)
        );
    }

    static webhook(text, type = 'log', ping = false) {
        const mode = logTypes[type];
        const embed = {
            title: mode.title + (development ? ' (Development)' : ''),
            color: botColors[mode.name],
            footer: { text: moment().tz('America/Toronto').format(formats.log) }
        };

        try {
            if (text.length < 2040) {
                if (type === 'error') text = `\`\`\`xl\n${text}\`\`\``;
                embed.description = text;
                logger.send(ping ? `<@${ownerID}>` : null, { embeds: [embed] });
            } else {
                logger.send(ping ? `<@${ownerID}>` : null, { embeds: [embed] });
                logger.send(text, { code: type === 'error' ? 'xl' : false, split: { char: '' } });
            }
        } catch (e) {
            Logger.write(e, 'error');
        }
    }
};