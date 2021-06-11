import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { readdir, readFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomResponse } from '../../util';

export default class extends Command {
    public constructor() {
        super('8ball', {
            aliases: ['8-ball', '8', 'eight', 'eight-ball'],
            description: 'Asks the Magic 8-Ball a question.',
            args: [
                {
                    id: 'question',
                    match: 'content',
                    prompt: {
                        start: 'What would you like to ask the Magic 8-Ball?'
                    }
                }
            ]
        });
    }

    public interactionOptions = {
        name: '8ball',
        description: 'Asks the Magic 8-Ball a question.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'question',
                description: 'The question to ask.',
                required: true
            }
        ]
    };

    public async exec(message: Message) {
        return message.util.send(await this.run());
    }

    public async interact(interaction: CommandInteraction) {
        await interaction.reply('Loading...');
        await interaction.editReply(await this.run());
    }

    private async run() {
        const imageDir = join(__dirname, '..', '..', '..', 'images', 'eight-balls');
        const answers = (await readdir(imageDir)).filter(f => extname(f) === '.png');

        const random = randomResponse(answers);
        const file = await readFile(join(imageDir, random));

        return {
            files: [
                this.client.util.attachment(file, random)
            ]
        };
    }
}