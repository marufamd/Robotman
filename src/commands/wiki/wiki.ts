import { Command } from 'discord-akairo';
import { Constants, CommandInteraction, Message } from 'discord.js';
import { formatQuery, trim } from '../../util';
import { wikiParams } from '../../util/constants';
import request from '../../util/request';

const BAD_WORDS_URL = 'https://raw.githubusercontent.com/RobertJGabriel/Google-profanity-words/master/list.txt';

export default class extends Command {
    private badWords: string[] = null;

    public constructor() {
        super('wiki', {
            aliases: ['wiki', 'wikipedia'],
            description: 'Searches Wikipedia.',
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                }
            ],
            typing: true,
            cooldown: 5e3
        });
    }

    public interactionOptions = {
        name: 'wiki',
        description: 'Searches Wikipedia.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { query }: { query: string }) {
        return message.util.send(await this.run(query));
    }

    public async interact(interaction: CommandInteraction, { query }: { query: string }) {
        const data = this.client.util.checkEmbed(await this.run(query));
        return interaction.reply(data);
    }

    private async run(query: string) {
        const wordlist = await this.getBadWords();
        if (query.split(/ +/).some(a => wordlist.includes(a))) return { content: 'You cannot search for that term.', ephemeral: true };

        const page = await this.search(formatQuery(query));
        if (!page) return { content: 'No results found.', ephemeral: true };

        const embed = this.client.util
            .embed()
            .setColor('#F8F8F8')
            .setTitle(page.title)
            .setDescription(page.description)
            .setURL(page.url)
            .setFooter('Wikipedia', 'https://upload.wikimedia.org/wikipedia/commons/7/75/Wikipedia_mobile_app_logo.png');

        if (page.image) embed.setImage(page.image);

        return { embed };
    }

    private async search(query: string) {
        const { body } = await request
            .get('https://en.wikipedia.org/w/api.php')
            .query(wikiParams(query));

        const page = body.query.pages[0];
        if (page.missing || !page.extract) return null;
        let description = page.extract;

        if (/(may )?(also )?refer to/gi.test(description)) {
            const links = page.links.map((l: { title: string }) => `[${l.title}](${this.getLink(l.title)})`).join('\n');
            description = `${trim(description.trimEnd(), 1015)}\n${trim(links, 1015)}`;
        } else {
            description = trim(description.split('\n')[0].trimEnd(), 1015);
        }

        return {
            title: page.title,
            description,
            url: this.getLink(page.title),
            image: page.thumbnail ? page.thumbnail.source : null
        };
    }

    private getLink(page: string) {
        return `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replaceAll(' ', '_'))}`;
    }

    private async getBadWords() {
        if (this.badWords) return this.badWords;
        const { text } = await request.get(BAD_WORDS_URL);
        this.badWords = text.split('\n');
        return this.badWords;
    }
}