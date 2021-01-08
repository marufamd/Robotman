const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const { randomResponse } = require('../../util');

const URL_REGEX = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gi;

module.exports = class extends Command {
    constructor() {
        super('choose', {
            aliases: ['choose'],
            description: {
                info: 'Chooses an option form multiple options.',
                usage: '<option 1> | <option 2> | [...other options]',
                examples: ['daredevil "the batman"'],
            },
            ownerOnly: true,
            args: [
                {
                    id: 'options',
                    match: 'content',
                    prompt: {
                        start: 'What options would you like me to choose from? Separate options with `|`, or provide a url with a list in raw text.'
                    }
                }
            ],
        });
    }

    async exec(message, { options }) {
        if (URL_REGEX.test(options.split(' ')[0])) {
            const url = options.split(' ')[0];
            const res = await request.get(url).then(res => res.text).catch(() => null);
            if (res) options = res.split('\n');
        } else {
            options = options.split('|').map(r => r.trim());
        }

        if (options.length < 2) return message.util.send('Please provide at least two options.');

        return message.util.send(`${message.author}, I choose **${randomResponse(options)}**`);
    }
};