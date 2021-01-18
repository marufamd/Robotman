import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { DateTime } from 'luxon';
import { closest, title } from '../../util';
import { formats, timezones } from '../../util/constants';

export default class extends Command {
    public constructor() {
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
                    type: (_, phrase) => {
                        if (!phrase) return null;
                        const target = closest(phrase.toLowerCase().split(' ').join('_'), timezones.map(t => t.toLowerCase()));
                        return timezones.find(t => t.toLowerCase() === target);
                    },
                    match: 'content',
                    prompt: {
                        start: 'What timezone would you like to view the current time in?'
                    }
                }
            ]
        });
    }

    public exec(message: Message, { timezone }: { timezone: string }) {
        const formatted = DateTime.local().setZone(timezone).toFormat(formats.clock);

        let formatText = (timezone.length <= 3) ? timezone.toUpperCase() : title(timezone.replaceAll(/(_|\/)/gi, ' '));
        formatText = timezone.includes('/') ? formatText.replace(' ', '/') : formatText;

        return message.util.send(`The current time for **${formatText.replaceAll('_', ' ')}** is **${formatted}**`);
    }
}