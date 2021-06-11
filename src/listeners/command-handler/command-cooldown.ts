import { oneLine } from 'common-tags';
import { Command, Listener } from 'discord-akairo';
import { CommandInteraction, Message } from 'discord.js';
import { plural, wait } from '../../util';

export default class extends Listener {
    public constructor() {
        super('command-cooldown', {
            event: 'cooldown',
            emitter: 'commandHandler'
        });
    }

    public async exec(thing: Message | CommandInteraction, command: Command, remaining: number) {
        const seconds = remaining / 1000;

        const isInteraction = thing instanceof CommandInteraction;
        const interaction = thing as CommandInteraction;
        const message = thing as Message;

        const text = (user: string) => oneLine`
        ${user}, please wait **${seconds.toFixed(1)}** ${plural('second', seconds)}
        before using \`${command.id}\` again. ${isInteraction ? '' : 'This message will delete when the cooldown ends.'}`;

        if (isInteraction) return interaction.reply({ content: text(interaction.user.toString()), ephemeral: true });

        const msg = await message.channel.send(text(message.author.toString()));
        await wait(remaining);

        return msg.delete();
    }
}