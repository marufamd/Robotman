import { Listener, Command } from 'discord-akairo';
import { Message, TextChannel } from 'discord.js';
import Interaction from '../../structures/Interaction';

export default class extends Listener {
    public constructor() {
        super('command-error', {
            event: 'error',
            emitter: 'commandHandler'
        });
    }

    public exec(error: any, message: Message | Interaction, command: Command) {
        if (error.message !== 'Unknown interaction') {
            if (message instanceof Interaction && !message.response) {
                void message.respond('An error occurred', { type: 'message', ephemeral: true });
            } else {
                const channel = message instanceof Interaction ? message.channel as TextChannel : message?.util;
                if (channel) void channel.send('An error occurred.');
            }
        }

        const extra = {
            title: `Command Error (${message instanceof Interaction ? 'Interaction' : 'Message'})`,
            fields: [
                {
                    name: 'User',
                    value: message.author.toString(),
                    inline: true
                },
                {
                    name: 'Channel',
                    value: message.channel.toString(),
                    inline: true
                }
            ]
        };

        if (command) {
            extra.fields.push({
                name: 'Command',
                value: command.id,
                inline: true
            });
        }

        this.client.log(error.stack, 'error', { ping: true }, extra);
    }
}