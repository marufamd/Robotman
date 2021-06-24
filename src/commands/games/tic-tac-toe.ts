import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import TicTacToe from '../../structures/TicTacToe';
import { choosePlayer } from '../../util';

export default class extends Command {
    public constructor() {
        super('tic-tac-toe', {
            aliases: ['tic-tac-toe', 'ttt'],
            description: 'Starts a Tic Tac Toe game.',
            editable: false
        });
    }

    public async exec(message: Message) {
        const data = await choosePlayer(message);
        if (!data) return;

        return new TicTacToe(
            data.message,
            data.interaction
        )
            .addPlayers(
                message.author,
                data.player
            )
            .run();
    }
}