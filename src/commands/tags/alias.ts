import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import type { Tag } from '../../structures/TagsProvider';

const plural = (length: number) => `alias${length === 1 ? '' : 'es'}`;

export default class extends Command {
    public constructor() {
        super('tag-alias', {
            aliases: ['tag-alias', 'alias-tag'],
            description: {
                info: 'Manages tag aliases.',
                usage: '<-add|-delete> <tag> <aliases>',
                examples: [
                    '-add test test1',
                    '-delete test est1'
                ]
            },
            args: [
                {
                    id: 'add',
                    match: 'flag',
                    flag: ['--add', '-add', '-a']
                },
                {
                    id: 'remove',
                    match: 'flag',
                    flag: ['--delete', '-delete', '-del', '-d', '--remove', '-remove']
                },
                {
                    id: 'tag',
                    type: 'tag',
                    prompt: {
                        start: 'What tag would you like to manage aliases for?',
                        retry: (_: Message, { phrase }: { phrase: string }) => `A tag with the name **${phrase}** does not exist. Please try again.`
                    }
                },
                {
                    id: 'aliases',
                    type: (_, phrase) => {
                        if (!phrase) return null;
                        return phrase
                            .split(',')
                            .map(a => a
                                .trim()
                                .replaceAll(/@|,/g, '')
                                .toLowerCase());
                    },
                    match: 'rest',
                    prompt: {
                        start: 'Which aliases would you like to manage?'
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { add, remove, tag, aliases }: { add: boolean; remove: boolean; tag: Tag; aliases: string[] }) {
        if (!add && !remove) return message.util.send(`The correct usage is \`${this.client.util.getPrefix(message)}${message.util.parsed.alias} ${this.description.usage}\`.`);

        let response: string;

        const modified = [];

        if (add) {
            for (const alias of aliases) {
                if (tag.aliases.includes(alias)) continue;
                tag.aliases.push(alias);
                modified.push(alias);
            }

            response = 'Added ';
        } else {
            for (const alias of aliases) {
                if (!tag.aliases.includes(alias)) continue;
                tag.aliases.splice(tag.aliases.indexOf(alias), 1);
                modified.push(alias);
            }
            response = 'Removed ';
        }

        const [updated] = await this.client.sql`
            update ${this.client.sql(this.client.tags.table)} set
            ${this.client.sql({ aliases: tag.aliases }, 'aliases')}
            where name = ${tag.name}
            and guild = ${tag.guild}
            returning *
            `;

        response += `${modified.length} ${plural(modified.length)} to tag **${updated.name}**`;

        return message.util.send(response);
    }
}