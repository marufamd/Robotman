import {
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction
} from 'discord.js';
import TicTacToeEngine, { GameStatus, Player } from 'tic-tac-toe-minimax-engine';
import { ticTacToe } from '../util/constants';

export default class TicTacToe {
    private readonly board: MessageActionRow[] = [];
    private readonly engine = new TicTacToeEngine(Player.PLAYER_ONE);

    public async run(message: Message) {
        this.createBoard();

        const msg = await message.channel.send({ content: ticTacToe.messages.match(message), components: this.board });

        const filter = (i: MessageComponentInteraction) => {
            const button = this.findButton(i.customID);
            return button.label === '\u200b' && message.author.id === i.user.id;
        };

        const firstMove = await msg.awaitMessageComponentInteraction(filter, 20000).catch(() => null);
        if (!firstMove) return msg.edit(ticTacToe.messages.forfeit(message));

        await firstMove.update({ content: ticTacToe.messages.match(message), components: this.updateBoard(firstMove.customID) });

        let status = this.engine.makeNextMove(...this.getSpace(firstMove.customID));
        let cpuTurn = true;

        while (status === GameStatus.ONGOING) {
            if (cpuTurn) {
                const { x, y } = this.engine.getBestMove();

                await msg.edit({ content: ticTacToe.messages.turn(message), components: this.updateBoard(`${x}${y}`, false) });

                status = this.engine.makeNextMove(x, y);
            } else {
                const move = await msg.awaitMessageComponentInteraction(filter, 20000).catch(() => null);
                if (!move) return msg.edit(ticTacToe.messages.forfeit(message));

                await move.update({ content: ticTacToe.messages.match(message), components: this.updateBoard(move.customID) });

                status = this.engine.makeNextMove(...this.getSpace(move.customID));
            }

            cpuTurn = !cpuTurn;
        }

        if (status === GameStatus.DRAW) {
            return msg.edit(ticTacToe.messages.draw(message));
        } else if (this.checkWin(status)) {
            return msg.edit(ticTacToe.messages.win(message, message.client.user));
        }

        return msg.edit(ticTacToe.messages.win(message, message.author));
    }

    private createBoard() {
        for (let i = 0; i < 3; i++) {
            const buttons = [];

            for (let j = 0; j < 3; j++) {
                buttons.push(
                    new MessageButton()
                        .setCustomID(`${i}${j}`)
                        .setLabel('\u200b')
                        .setStyle('SECONDARY')
                );
            }

            this.board.push(new MessageActionRow().addComponents(...buttons));
        }
    }

    private updateBoard(id: string, first = true) {
        const button = this.findButton(id);

        button
            .setLabel(first ? ticTacToe.emojis.o : ticTacToe.emojis.x)
            .setStyle(first ? ticTacToe.styles.o : ticTacToe.styles.x)
            .setDisabled(true);

        return this.board;
    }

    private findButton(id: string) {
        for (const row of this.board) {
            for (const button of row.components) {
                if (button.customID === id) return button;
            }
        }
    }

    private getSpace(id: string) {
        return id.split('').map(Number) as [number, number];
    }

    private checkWin(status: GameStatus) {
        return [
            GameStatus.WIN_ON_HORIZONTAL,
            GameStatus.WIN_ON_VERTICAL,
            GameStatus.WIN_ON_LEFT_DIAGONAL,
            GameStatus.WIN_ON_RIGHT_DIAGONAL
        ]
            .includes(status);
    }
}