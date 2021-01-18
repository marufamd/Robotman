import { Inhibitor } from 'discord-akairo';
import { Message, Permissions } from 'discord.js';

export default class extends Inhibitor {
    public constructor() {
        super('mod', {
            reason: 'Moderator Command'
        });
    }

    public exec(message: Message) {
        if (!message.util?.parsed?.command?.mod) return false;
        return !this.client.isOwner(message.author) && !message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD);
    }
}