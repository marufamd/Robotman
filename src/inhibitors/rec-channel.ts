import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';
import { recChannels } from '../util/constants';

export default class extends Inhibitor {
    public constructor() {
        super('rec-channel', {
            reason: 'Not a recommendation channel'
        });
    }

    public exec(message: Message) {
        if (message.util?.parsed?.command?.id !== 'recs') return false;

        return !recChannels.includes(message.channel.id);
    }
}