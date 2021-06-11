import { Command } from 'discord-akairo';
import { CommandInteraction, Message } from 'discord.js';
import { extname } from 'path';
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
        return message.util.send(await this.run());
    }

    public async interact(interaction: CommandInteraction) {
        await interaction.reply('Loading...');
        await interaction.editReply(await this.run());
    }

    private async run() {
        const { body: { url } } = await request.get('https://random.dog/woof.json');
        return {
            files: [
                this.client.util.attachment(url, `dog${extname(url)}`)
            ]
        };
    }
}