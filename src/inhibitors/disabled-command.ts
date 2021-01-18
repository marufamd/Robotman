import { Inhibitor } from 'discord-akairo';
import { Message } from 'discord.js';

export default class extends Inhibitor {
    public constructor() {
        super('disabled-command', {
            reason: 'Disabled Command'
        });
    }

    public exec(message: Message) {
        if (!message.util?.parsed?.command) return false;
        const disabled = this.client.settings.get(message.guild.id, 'disabled_commands', []);
        return disabled.includes(message.util.parsed.command.id);
    }
}