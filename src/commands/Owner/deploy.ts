import { Commands } from '#util/commands';
import type { Command, CommandOptions } from '#util/commands';
import { Emojis } from '#util/constants';
import { codeBlock } from '@discordjs/builders';
import type { Message } from 'discord.js';
import { Client } from 'discord.js';
import { inject, injectable } from 'tsyringe';

@injectable()
export default class implements Command {
    public constructor(
        private readonly client: Client,
        @inject('commands') private readonly commands: Commands
    ) {}

    public options: CommandOptions = {
        description: 'Deploys the bot\'s slash commands.',
        args: [
            {
                name: 'del',
                match: 'flag',
                flags: ['delete', 'del', 'd']
            }
        ],
        owner: true
    };

    public async exec(message: Message, { del }: { del: boolean }) {
        const msg = await message.send(`${Emojis.LOADING} ${del ? 'Deleting' : 'Deploying'} slash commands...`);

        try {
            if (del) {
                await this.client.application.commands.set([]);
                return msg.edit(`${Emojis.DELETE} Successfully deleted all slash commands.`);
            }

            const slashCommands = [];

            for (const command of this.commands.values()) {
                if (typeof command.interact !== 'function') continue;

                slashCommands.push({
                    name: command.options.name,
                    description: command.options.description,
                    options: command.interactionOptions
                });
            }

            const deployed = await this.client.application.commands.set(slashCommands);

            return msg.edit(`${Emojis.SUCCESS} Successfully deployed ${deployed.size} slash commands.\n${codeBlock(deployed.map(c => `/${c.name} - ${c.id}`).join('\n'))}`);
        } catch (e) {
            return msg.edit(`${Emojis.FAIL} An error occurred while ${del ? 'deleting' : 'deploying'} commands:\n${codeBlock('js', e.stack ?? e)}`);
        }
    }
}