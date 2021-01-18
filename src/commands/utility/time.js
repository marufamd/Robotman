const { Command } = require('discord-akairo');
const { DateTime } = require('luxon');
const { title, closest } = require('../../util');
const { timezones, formats } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('time', {
            aliases: ['time', 'time-zone', 'convert-time', 'current-time'],
            description: {
                info: 'Shows the current time in a specified timezone.',
                usage: '<timezone>',
                extended: ['To view a list of timezones, do `{p}timezones index`'],
                examples: [
                    'utc',
                    'los angeles',
                    'America/New York',
                    'gmt'
                ]
            },
            args: [
                {
                    id: 'timezone',
                    type: 'lowercase',
                    match: 'content',
                    prompt: {
                        start: 'What timezone would you like to view the current time in?'
                    }
                }
            ]
        });
    }

    async exec(message, { timezone }) {
        timezone = timezone.split(' ').join('_');
        const target = closest(timezone, timezones.map(t => t.toLowerCase()));

        const formatted = DateTime.local().setZone(timezones.find(t => t.toLowerCase() === target)).toFormat(formats.clock);
        let formatText = (target.length <= 3) ? target.toUpperCase() : title (target.replaceAll(/(_|\/)/gi, ' '));
        formatText = target.includes('/') ? formatText.replace(' ', '/') : formatText;

        return message.util.send(`The current time for **${formatText.replaceAll('_', ' ')}** is **${formatted}**`);
    }
};