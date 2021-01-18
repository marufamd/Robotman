import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import { Message } from 'discord.js';
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import Interaction from '../../structures/Interaction';
import { randomResponse } from '../../util';

export default class extends Command {
    public constructor() {
        super('8ball', {
            aliases: ['8-ball', '8', 'eight', 'eight-ball'],
            description: {
                info: 'Asks the Magic 8-Ball a question.',
                usage: '<question>',
                examples: ['Is Daredevil awesome?']
            },
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
                type: ApplicationCommandOptionType.STRING,
                name: 'question',
                description: 'The question to ask.',
                required: true
            }
        ]
    };

    public async exec(message: Message) {
        return message.util.send(await this.main());
    }

    public async interact(interaction: Interaction) {
        await interaction.respond({ type: 'acknowledgeWithSource' });
        return interaction.send(await this.main());
    }

    private async main() {
        const imageDir = join(__dirname, '..', '..', '..', '..', 'images', 'eight-balls');
        const answers = (await readdir(imageDir)).filter(f => extname(f) === '.png');

        const random = randomResponse(answers);
        const file = await readFile(join(imageDir, random));

        return this.client.util.attachment(file, random);
    }
}