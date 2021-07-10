import {
    ButtonInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    MessageButtonRow,
    User
} from 'discord.js';
import * as engine from 'tictactoe-minimax-ai';
import { randomResponse } from '../util';
import { ticTacToe } from '../util/constants';

export default class TicTacToe {
    private readonly board: MessageButtonRow[] = [];
    private readonly players: User[] = [];

    public constructor(private readonly message: Message, private interaction: ButtonInteraction) {
        this.message = message;
        this.interaction = interaction;
    }

    public async run() {
        this.createBoard();

        const firstPlayer = randomResponse(this.players);
        const secondPlayer = this.getOtherPlayer(firstPlayer);

        await this.interaction.editReply({
            content: ticTacToe.messages.turn(firstPlayer, secondPlayer, firstPlayer.bot ? secondPlayer : firstPlayer),
            components: this.board
        });

        let otherTurn = false;

        while (engine.boardEvaluate(this.arrayBoard).status === 'none') {
            const currentPlayer = otherTurn ? secondPlayer : firstPlayer;

            if (currentPlayer.bot) {
                const cpuMove = engine
                    .bestMove(
                        this.arrayBoard,
                        {
                            computer: 'o',
                            opponent: 'x'
                        }
                    )
                    .toString();

                await this.interaction.editReply({
                    content: ticTacToe.messages.turn(firstPlayer, this.getOtherPlayer(firstPlayer), this.getOtherPlayer(currentPlayer)),
                    components: this.updateBoard(cpuMove, currentPlayer.id === firstPlayer.id)
                });
            } else {
                await this.makeMove(currentPlayer, firstPlayer);
            }

            otherTurn = !otherTurn;
        }

        const { status } = engine.boardEvaluate(this.arrayBoard);

        let endMessage: string;

        switch (status as 'win' | 'loss' | 'tie') {
            case 'win':
                endMessage = ticTacToe.messages.win(secondPlayer, firstPlayer);
                break;
            case 'loss':
                endMessage = ticTacToe.messages.win(firstPlayer, secondPlayer);
                break;
            case 'tie':
                endMessage = ticTacToe.messages.draw(firstPlayer, secondPlayer);
                break;
        }

        return this.interaction.editReply({
            content: endMessage,
            components: this.disableEmptyButtons()
        });
    }

    public addPlayers(...players: User[]) {
        this.players.push(...players);
        return this;
    }

    private async makeMove(player: User, firstPlayer: User): Promise<void> {
        const filter = (i: ButtonInteraction) => {
            const button = this.findButton(i.customId);
            return button.label === '\u200b' && player.id === i.user.id;
        };

        const opponent = this.getOtherPlayer(player);

        const move = await this.message.awaitMessageComponent({ filter, time: 20000 }).catch(() => null);

        if (!move) {
            await this.interaction.editReply({
                content: ticTacToe.messages.forfeit(player, opponent),
                components: this.disableEmptyButtons()
            });

            return null;
        }

        await move.update({
            content: ticTacToe.messages.turn(firstPlayer, this.getOtherPlayer(firstPlayer), opponent.bot ? player : opponent),
            components: this.updateBoard(move.customId, player.id === firstPlayer.id)
        });

        this.interaction = move;
    }

    private getOtherPlayer(player: User) {
        return this.players.find(u => u.id !== player.id);
    }

    private createBoard() {
        let id = 0;

        for (let i = 0; i < 3; i++) {
            const buttons = [];

            for (let j = 0; j < 3; j++) {
                buttons.push(
                    new MessageButton()
                        .setCustomId(id.toString())
                        .setLabel('\u200b')
                        .setStyle('SECONDARY')
                );

                id++;
            }

            this.board.push(new MessageActionRow().addComponents(...buttons) as MessageButtonRow);
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

    private get arrayBoard() {
        return this.board.map(r => r.components.map(c => {
            switch (c.label) {
                case '\u200b':
                    return '_';
                case ticTacToe.emojis.o:
                    return 'o';
                case ticTacToe.emojis.x:
                    return 'x';
            }
        }));
    }

    private findButton(id: string) {
        for (const row of this.board) {
            for (const button of row.components) {
                if (button.customId === id) return button;
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
}