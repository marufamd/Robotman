import {
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    User
} from 'discord.js';
import TicTacToeEngine, { GameStatus, Player } from 'tic-tac-toe-minimax-engine';
import { randomResponse } from '../util';
import { ticTacToe } from '../util/constants';

export default class TicTacToe {
    private readonly board: MessageActionRow[] = [];
    private readonly engine = new TicTacToeEngine(Player.PLAYER_ONE);
    private readonly player1: User;
    private readonly player2: User;
    private readonly players: [User, User];
    private readonly cpu: boolean;
    private readonly message: Message;

    public constructor(message: Message, player1: User, player2: User) {
        this.message = message;
        this.player1 = player1;
        this.player2 = player2;
        this.players = [this.player1, this.player2];
        this.cpu = this.player2.id === message.client.user.id ? true : false;
    }

    public async run() {
        this.createBoard();

        const firstPlayer = this.firstPlayer();

        await this.message.edit({
            content: ticTacToe.messages.turn(this.player1, this.player2, firstPlayer),
            components: this.board
        });

        const filter = (i: MessageComponentInteraction) => {
            const button = this.findButton(i.customID);
            return button.label === '\u200b' && firstPlayer.id === i.user.id;
        };

        const firstMove = await this.message.awaitMessageComponentInteraction(filter, 20000).catch(() => null);
        if (!firstMove) {
            return this.message.edit({
                content: ticTacToe.messages.forfeit(firstPlayer, this.getOtherPlayer(firstPlayer)),
                components: this.disableEmptyButtons()
            });
        }

        await firstMove.update({
            content: ticTacToe.messages.match(this.player1, this.player2),
            components: this.updateBoard(firstMove.customID, firstPlayer.id === this.player2.id)
        });

        let status = this.engine.makeNextMove(...this.getSpace(firstMove.customID));
        let otherTurn = firstPlayer.id !== this.player2.id;

        while (status === GameStatus.ONGOING) {
            await this.message.edit(ticTacToe.messages.turn(this.player1, this.player2, otherTurn ? this.player2 : this.player1));

            if (otherTurn && this.cpu) {
                const { x, y } = this.engine.getBestMove();

                await this.message.edit({ components: this.updateBoard(`${x}${y}`, false) });

                status = this.engine.makeNextMove(x, y);
            } else {
                status = await this.makeMove(otherTurn ? this.player2 : this.player1);
            }

            otherTurn = !otherTurn;
        }

        let endMessage = ticTacToe.messages.win(this.player2, this.player1);

        if (status === GameStatus.DRAW) {
            endMessage = ticTacToe.messages.draw(this.player1, this.player2);
        } else if (this.checkWin(status)) {
            endMessage = ticTacToe.messages.win(this.player1, this.player2);
        }

        return this.message.edit({
            content: endMessage,
            components: this.disableEmptyButtons()
        });
    }

    private async makeMove(player: User) {
        const filter = (i: MessageComponentInteraction) => {
            const button = this.findButton(i.customID);
            return button.label === '\u200b' && player.id === i.user.id;
        };

        const move = await this.message.awaitMessageComponentInteraction(filter, 20000).catch(() => null);

        if (!move) {
            await this.message.edit({
                content: ticTacToe.messages.forfeit(player, this.getOtherPlayer(player)),
                components: this.disableEmptyButtons()
            });

            return null;
        }

        await move.update({
            content: ticTacToe.messages.match(this.player1, this.player2),
            components: this.updateBoard(move.customID, player.id === this.player2.id)
        });

        return this.engine.makeNextMove(...this.getSpace(move.customID));
    }

    private firstPlayer() {
        if (this.cpu) return this.player1;
        return randomResponse(this.players);
    }

    private getOtherPlayer(player: User) {
        return this.players.find(u => u.id !== player.id);
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

    private disableEmptyButtons() {
        for (const row of this.board) {
            for (const button of row.components) {
                if (button.label === '\u200b') button.setDisabled(true);
            }
        }

        return this.board;
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