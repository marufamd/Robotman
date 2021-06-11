import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('enable', {
            aliases: ['enable', 'enable-command'],
            description: 'Enables a command.',
            args: [
                {
                    id: 'command',
                    type: 'commandAlias',
                    prompt: {
                        start: 'What command would you like to enable?',
                        retry: 'Invalid command. Please try again.'
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { command }: { command: Command }) {
        let response = `The command **${command.id}** is not disabled.`;

        const disabled = this.client.settings.get(message.guild, 'disabled_commands', []);

        if (disabled.includes(command.id)) {
            disabled.splice(disabled.indexOf(command.id), 1);
            await this.client.settings.set(message.guild, 'disabled_commands', disabled);
            response = `Enabled the command **${command.id}**`;
        }

        return message.util.send(response);
    }
}