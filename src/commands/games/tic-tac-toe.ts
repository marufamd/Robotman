import { Command } from 'discord-akairo';
import { Message, MessageActionRow, MessageButton } from 'discord.js';
import TicTacToe from '../../structures/TicTacToe';

export default class extends Command {
    public constructor() {
        super('tic-tac-toe', {
            aliases: ['tic-tac-toe', 'ttt'],
            description: 'Starts a Tic Tac Toe game.',
            lock: 'channel'
        });
    }

    public async exec(message: Message) {
        const data = await this.choosePlayer(message);
        if (!data) return;

        await new TicTacToe(data.message, message.author, data.player).run();
    }

    private async choosePlayer(message: Message) {
        const row = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomID('human')
                    .setLabel('Human')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomID('cpu')
                    .setLabel('Computer')
                    .setStyle('DANGER')
            );

        const msg = await message.channel.send({
            content: 'Who would you like to play against? You have ten seconds to choose.',
            components: [row]
        });

        const option = await msg.awaitMessageComponentInteraction(
            i => i.user.id === message.author.id,
            10000
        );

        if (!option) {
            await msg.edit({
                content: 'You took too long. The game has been cancelled.',
                components: []
            });

            return null;
        }

        if (option.customID === 'cpu') {
            await option.update({
                content: 'Loading...',
                components: []
            });

            return {
                message: msg,
                player: this.client.user
            };
        }

        const joinRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomID('join')
                    .setLabel('Join')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomID('cancel')
                    .setLabel('Cancel')
                    .setStyle('DANGER')
            );

        await option.update({
            content: `**${message.author.username}** has started a game! Click the Join button to face them. To cancel the game, click Cancel.`,
            components: [joinRow]
        });

        const response = await msg
            .awaitMessageComponentInteraction(
                i => (i.user.id === message.author.id && i.customID === 'cancel') || (i.user.id !== message.author.id && i.customID === 'join'),
                300000
            )
            .catch(() => null);

        if (!response) {
            await msg.edit({
                content: 'No one has joined. The game has been cancelled.',
                components: []
            });

            return null;
        }

        if (response.customID === 'cancel') {
            await response.update({
                content: 'The game has been cancelled.',
                components: []
            });

            return null;
        }

        await response.update({
            content: `**${response.user.tag}** has joined the game!`,
            components: []
        });

        return {
            message: msg,
            player: response.user
        };
    }
}