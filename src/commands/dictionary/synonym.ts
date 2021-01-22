import { Command } from 'discord-akairo';
import { APIInteractionResponseType, ApplicationCommandOptionType } from 'discord-api-types/v8';
import type { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';
import { define, Synonyms } from '../../util';
import { colors } from '../../util/constants';

const BASE_URL = 'https://www.merriam-webster.com';

export default class extends Command {
    public constructor() {
        super('synonym', {
            aliases: ['synonym', 'thesaurus', 'synonyms', 'syns', 'syn'],
            description: {
                info: 'Displays synonyms for a word from the thesaurus.',
                usage: '<word>',
                examples: ['robot']
            },
            args: [
                {
                    id: 'word',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What word would you like to see synonyms for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    public interactionOptions = {
        name: 'synonym',
        description: 'Shows synonyms for a word from the thesaurus.',
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
        const defined = await define(word, true) as Synonyms;
        if (!defined?.synonyms?.length) return { content: 'No synonyms found', type: APIInteractionResponseType.ChannelMessage, ephemeral: true };

        const embed = this.client.util
            .embed()
            .setAuthor('Merriam-Webster', 'https://pbs.twimg.com/profile_images/677210982616195072/DWj4oUuT.png', BASE_URL)
            .setColor(colors.DICTIONARY);

        if (Array.isArray(defined)) {
            embed
                .setTitle(`No synonyms found for \`${word}\``)
                .addField('Did you mean:', defined.map(a => `[${a}](${BASE_URL}/thesaurus/${encodeURIComponent(a)})`).join('\n'));
        } else {
            embed
                .setTitle(`Synonyms for ${defined.word}`)
                .setURL(`https://www.merriam-webster.com/thesaurus/${encodeURIComponent(defined.word)}`)
                .setDescription(defined.synonyms.map(s => `[${s}](${BASE_URL}/dictionary/${encodeURIComponent(s)})`));
        }

        return embed;
    }
}