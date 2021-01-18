import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import Akinator from '../../structures/Akinator';

export default class extends Command {
    public constructor() {
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
            editable: false,
            lock: 'channel'
        });
    }

    public async exec(message: Message) {
        await message.channel.send('Starting...');
        await new Akinator().run(message);
    }
}