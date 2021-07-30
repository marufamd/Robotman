import type { Command, CommandOptions } from '#util/commands';
import { TicTacToe } from '#util/constants';
import { TicTacToeGame } from '#util/games';
import { choosePlayer, getUser, randomResponse } from '#util/misc';
import { CommandInteraction, Message } from 'discord.js';
import * as TicTacToeEngine from 'tictactoe-minimax-ai';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['ttt'],
        description: 'Starts a Tic Tac Toe game.',
        extended: 'You can choose to play against another user or the bot.',
        disableEdits: true
    };

    public async exec(message: Message) {
        return this.run(message);
    }

    public async interact(interaction: CommandInteraction) {
        return this.run(interaction);
    }

    private async run(data: Message | CommandInteraction) {
        const playerData = await choosePlayer(data);
        if (!playerData) return;

        const game = new TicTacToeGame(playerData.message, playerData.interaction)
            .addPlayers(
                getUser(data),
                playerData.player
            )
            .createBoard();

        const firstPlayer = randomResponse(game.players);
        const secondPlayer = game.getOtherPlayer(firstPlayer);

        await game.interaction.editReply({
            content: TicTacToe.MESSAGES.turn(firstPlayer, secondPlayer, firstPlayer.bot ? secondPlayer : firstPlayer),
            components: game.board
        });

        let otherTurn = false;
        let { status } = TicTacToeEngine.boardEvaluate(game.arrayBoard);

        while (status === 'none') {
            const currentPlayer = otherTurn ? secondPlayer : firstPlayer;

            if (currentPlayer.bot) {
                const cpuMove = TicTacToeEngine
                    .bestMove(
                        game.arrayBoard,
                        { computer: 'o', opponent: 'x' }
                    )
                    .toString();

                await game.interaction.editReply({
                    content: TicTacToe.MESSAGES.turn(firstPlayer, game.getOtherPlayer(firstPlayer), game.getOtherPlayer(currentPlayer)),
                    components: game.updateBoard(cpuMove, currentPlayer.id === firstPlayer.id)
                });
            } else {
                await game.makeMove(currentPlayer, firstPlayer);
            }

            otherTurn = !otherTurn;
            status = TicTacToeEngine.boardEvaluate(game.arrayBoard).status;
        }

        let endMessage: string;

        switch (status) {
            case 'win':
                endMessage = TicTacToe.MESSAGES.win(secondPlayer, firstPlayer);
                break;
            case 'loss':
                endMessage = TicTacToe.MESSAGES.win(firstPlayer, secondPlayer);
                break;
            case 'tie':
                endMessage = TicTacToe.MESSAGES.draw(firstPlayer, secondPlayer);
                break;
        }

        return game.interaction.editReply({
            content: endMessage,
            components: game.disableEmptyButtons()
        });
    }
}