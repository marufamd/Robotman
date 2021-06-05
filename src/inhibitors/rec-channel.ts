import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';
import { recChannels } from '../util/constants';

export default class extends Inhibitor {
    public constructor() {
        super('rec-channel', {
            reason: 'Not a recommendation channel',
            type: 'all'
        });
    }

    public exec(message: Message) {
        if (message.util?.parsed?.command?.id !== 'recs' ||
            /^taste test$/i.test(message.content) ||
            /^writers? rec(ommendation)?s$/i.test(message.content)) return;

        return !recChannels.includes(message.channel.id);
    }
}