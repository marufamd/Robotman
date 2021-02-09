import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types/v8';
import type { Message } from 'discord.js';
import type Interaction from '../../structures/Interaction';
import { capitalize, define, Definition, trim } from '../../util';
import { colors } from '../../util/constants';

const BASE_URL = 'https://www.merriam-webster.com';

export default class extends Command {
    public constructor() {
        super('define', {
            aliases: ['define', 'dictionary'],
            description: {
                info: 'Shows a definition for a word from the dictionary.',
                usage: '<word>',
                examples: ['robot']
            },
            args: [
                {
                    id: 'word',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What word would you like to search for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    public interactionOptions = {
        name: 'define',
        description: 'Shows a definition for a word from the dictionary.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'word',
                description: 'The word to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { word }: { word: string }) {
        return message.util.send(await this.main(word));
    }

    public async interact(interaction: Interaction) {
        const word = interaction.option('word') as string;
        return interaction.respond(await this.main(word));
    }

    private async main(word: string) {
        const defined = await define(word) as Definition;
        if (!defined) return 'No results found';

        const embed = this.client.util
            .embed()
            .setAuthor('Merriam-Webster', 'https://pbs.twimg.com/profile_images/677210982616195072/DWj4oUuT.png', BASE_URL)
            .setColor(colors.DICTIONARY);

        if (Array.isArray(defined)) {
            embed
                .setTitle(`No results found for \`${word}\``)
                .addField('Did you mean:', defined.map(a => `[${a}](${BASE_URL}/dictionary/${encodeURIComponent(a)})`).join('\n'));
        } else {
            embed
                .setTitle(defined.word)
                .setURL(`${BASE_URL}/dictionary/${encodeURIComponent(defined.word)}`)
                .setDescription(trim(defined.definitions
                    .map(a => {
                        if (defined.definitions.indexOf(a) === 0) return a;
                        return `• ${a}`;
                    })
                    .join('\n\n'), 2040))
                .addField('Part of Speech', capitalize(defined.type));
            if (defined.date) embed.addField('First Known Use', defined.date);
        }

        return embed;
    }
}