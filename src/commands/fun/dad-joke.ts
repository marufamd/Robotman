import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import type Interaction from '../../structures/Interaction';
import { dadJoke } from '../../util';

export default class extends Command {
    public constructor() {
        super('dadjoke', {
            aliases: ['dad-joke'],
            description: 'Sends a dad joke.',
            cooldown: 3e5
        });
    }

    public interactionOptions = {
        name: 'dadjoke',
        description: 'Sends a dad joke.'
    };

    public async exec(message: Message) {
        return message.util.send(await dadJoke());
    }

    public async interact(interaction: Interaction) {
        return interaction.respond(await dadJoke());
    }
}