const { Command } = require('discord-akairo');
const Akinator = require('../../structures/Akinator');

module.exports = class extends Command {
    constructor() {
        super('akinator', {
            aliases: ['akinator', 'aki'],
            description: {
                info: 'Starts an Akinator game.',
                extended: [
                    'You have 40 seconds to answer each question, or else you automatically lose.',
                    'Aliases for answers:',
                    'Yes: `y`, `yeah`, `ye`',
                    'No: `n`, `nah`',
                    'Don\'t Know: `d`, `dk`, `idk`, `dunno`',
                    'Probably: `p`, `prob`, `probs`',
                    'Probably Not: `pn`, `prob not`, `probs not`',
                    'Back: `b`',
                    'Stop: `s`'
                ]
            },
            editable: false
        });
    }

    async exec(message) {
        if (this.client.aki.has(message.channel.id)) return message.util.send('There is already an Akinator game in progress in this channel.');

        message.channel.send('Starting...');

        try {
            this.client.config.stat('aki');
            this.client.aki.add(message.channel.id);
            await new Akinator().run(message);
        } catch (e) {
            message.util.send('An error occurred.');
            this.client.log(`Akinator Error\n${e.stack}`, 'error', { ping: true });
        } finally {
            this.client.aki.delete(message.channel.id);
        }
    }
};