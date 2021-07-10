import { Command, Listener } from 'discord-akairo';
import { CommandInteraction, Message } from 'discord.js';

export default class extends Listener {
    public constructor() {
        super('command-error', {
            event: 'error',
            emitter: 'commandHandler'
        });
    }

    public exec(error: any, data: Message | CommandInteraction, command: Command) {
        const interaction = data as CommandInteraction;
        const message = data as Message;

        const err = { content: 'An error occurred.', ephemeral: true };

        if (data instanceof CommandInteraction) {
            if (interaction.replied) {
                void interaction.followUp(err);
            } else {
                void interaction.reply(err);
            }
        } else {
            void message.util.send(err);
        }

        const extra = {
            title: `Command Error (${message.constructor.name})`,
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
        } as {
            title: string;
            fields: { name: string; value: string; inline: boolean }[];
        };

        if (command) {
            extra.fields.push({
                name: 'Command',
                value: command.id,
                inline: true
            });
        }

        this.client.log(error.stack ?? error, 'error', { ping: true }, extra);
    }
}