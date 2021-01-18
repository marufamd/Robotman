import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { extname } from 'path';
import Interaction from '../../structures/Interaction';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('random-dog', {
            aliases: ['random-dog', 'dog', 'r-dog'],
            description: 'Sends a random dog image/gif.',
            typing: true
        });
    }

    public interactionOptions = {
        name: 'random-dog',
        description: 'Sends a random dog image/gif'
    };

    public async exec(message: Message) {
        return message.util.send(await this.main());
    }

    public async interact(interaction: Interaction) {
        await interaction.respond({ type: 'acknowledgeWithSource' });
        return interaction.send(await this.main());
    }

    private async main() {
        const { body: { url } } = await request.get('https://random.dog/woof.json');
        return this.client.util.attachment(url, `dog${extname(url)}`);
    }
}