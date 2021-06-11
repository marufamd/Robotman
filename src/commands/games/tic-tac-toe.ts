import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
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
        await new TicTacToe().run(message);
    }
}