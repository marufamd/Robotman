import { Command } from 'discord-akairo';
import { CommandInteraction, Message } from 'discord.js';
import { extname } from 'path';
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
        return message.util.send(await this.run());
    }

    public async interact(interaction: CommandInteraction) {
        await interaction.reply('Loading...');
        await interaction.editReply(await this.run());
    }

    private async run() {
        const { body: { file } } = await request.get('https://aws.random.cat/meow');
        return {
            files: [
                this.client.util.attachment(file, `cat${extname(file)}`)
            ]
        };
    }
}