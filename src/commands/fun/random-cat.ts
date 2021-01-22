import { Command } from 'discord-akairo';
import { APIInteractionResponseType } from 'discord-api-types/v8';
import type { Message } from 'discord.js';
import { extname } from 'path';
import type Interaction from '../../structures/Interaction';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('random-cat', {
            aliases: ['random-cat', 'cat', 'r-cat'],
            description: 'Sends a random cat image/gif.',
            typing: true
        });
    }

    public interactionOptions = {
        name: 'random-cat',
        description: 'Sends a random cat image/gif'
    };

    public async exec(message: Message) {
        return message.util.send(await this.main());
    }

    public async interact(interaction: Interaction) {
        await interaction.respond({ type: APIInteractionResponseType.AcknowledgeWithSource });
        return interaction.send(await this.main());
    }

    private async main() {
        const { body: { file } } = await request.get('https://aws.random.cat/meow');
        return this.client.util.attachment(file, `cat${extname(file)}`);
    }
}