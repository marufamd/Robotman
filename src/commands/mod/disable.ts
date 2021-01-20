import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('disable', {
            aliases: ['disable', 'disable-command'],
            description: {
                info: 'Disables a command.',
                usage: '<command>',
                examples: ['ping']
            },
            args: [
                {
                    id: 'command',
                    type: 'commandAlias',
                    prompt: {
                        start: 'What command would you like to disable?',
                        retry: 'Invalid command. Please try again.'
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { command }: { command: Command }) {
        let response = `The command **${command.id}** is already disabled.`;

        const disabled = this.client.settings.get(message.guild.id, 'disabled_commands', []);
        if (!disabled.includes(command.id)) {
            disabled.push(command.id);
            await this.client.settings.set(message.guild.id, 'disabled_commands', disabled);
            response = `Disabled the command **${command.id}**`;
        }

        return message.util.send(response);
    }
}