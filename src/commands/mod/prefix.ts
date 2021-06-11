import { Argument, Command, PrefixSupplier } from 'discord-akairo';
import type { Message } from 'discord.js';

const MAX_CHARS = 5;

export default class extends Command {
    public constructor() {
        super('prefix', {
            aliases: ['prefix', 'set-prefix'],
            description: `Changes the bot prefix for the server. Maximum length of ${MAX_CHARS} characters.`,
            args: [
                {
                    id: 'prefix',
                    type: Argument.validate('string', (m, p, str) => str.length < MAX_CHARS),
                    prompt: {
                        start: `What prefix would you like to set? The maximum length is ${MAX_CHARS} characters.`,
                        retry: `That prefix is too long. Please try again. The maximum length is ${MAX_CHARS} characters.`
                    }
                }
            ]
        });
    }

    public data = {
        extended: ['To reset the prefix, do {p}prefix reset'],
        usage: '<new prefix>',
        examples: ['$']
    };

    public mod = true;

    public async exec(message: Message, { prefix }: { prefix: string | null }) {
        const current = (this.handler.prefix as PrefixSupplier)(message);
        let response = `Changed the prefix for **${message.guild.name}** from **${current}** to **${prefix}**`;

        if ([process.env.CLIENT_PREFIX, 'reset'].includes(prefix)) {
            prefix = null;
            response = `Reset the prefix for **${message.guild.name}** to **${process.env.CLIENT_PREFIX}**`;
        }

        const row = await this.client.settings.set(message.guild, 'prefix', prefix);
        if (row) return message.util.send(response);

        return message.util.send('Unable to change prefix.');
    }
}