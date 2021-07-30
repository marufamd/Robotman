import type { Command, CommandOptions } from '#util/commands';
import { dadJoke } from '#util/wrappers';
import { CommandInteraction, Message } from 'discord.js';

export default class implements Command {
    public options: CommandOptions = {
        description: 'Sends a dad joke.',
        cooldown: 3
    };

    public async exec(message: Message) {
        return message.send(await dadJoke());
    }

    public async interact(interaction: CommandInteraction) {
        return interaction.reply(await dadJoke());
    }
}