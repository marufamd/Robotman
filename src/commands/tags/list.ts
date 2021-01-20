import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('tag-list', {
            aliases: ['tags', 'tag-list', 'list-tags'],
            description: 'Lists all available tags.'
        });
    }

    public async exec(message: Message) {
        const tags = await this.client.sql<{ name: string }>`
        select name from tags
        where guild = ${message.guild.id}
        `;

        if (tags.count === 0) return message.util.send('There are no tags set for this server.');

        const embed = this.client.util.embed()
            .setTitle('Available Tags')
            .setDescription(tags.map(t => t.name).join(', '))
            .setFooter(`Total: ${tags.count}`);

        return message.util.send(embed);
    }
}