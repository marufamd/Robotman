import { ConnectFour, Hangman, TicTacToe } from '#util/constants';
import { codeBlock } from '@discordjs/builders';
import { stripIndents } from 'common-tags';
import type {
    ButtonInteraction,
    Message, User
} from 'discord.js';
import {
    MessageActionRow,
    MessageButton
} from 'discord.js';
import { GoogleSpreadsheet } from 'google-spreadsheet';

interface MessageButtonRow extends MessageActionRow {
    components: MessageButton[];
}

/**
 * Game Classes
 * Connect Four, Hangman, TicTacToe, Trivia
 */

export class ConnectFourGame {
    public readonly players: User[] = [];
    public readonly board: Array<string[]> = [];

    public makeBoard(): this {
        for (let i = 0; i < 6; i++) this.board.push(Array(7).fill(ConnectFour.PIECES.default));
        this.board.push(ConnectFour.NUMBERS);
        return this;
    }

    public addPlayers(...players: User[]): this {
        this.players.push(...players);
        return this;
    }

    public addPiece(num: number, piece: 'yellow' | 'red'): boolean {
        let success = false;

        for (let i = this.board.length - 2; i >= 0; i--) {
            const row = this.board[i];
            const place = row[num - 1];

            if (place !== ConnectFour.PIECES.default) continue;

            row[num - 1] = ConnectFour.PIECES[piece];
            success = true;

            break;
        }

        return success;
    }

    public get currentBoard(): string {
        return this.board
            .map(r => r.join(''))
            .join('\n');
    }

    public get boardFull(): boolean {
        const board = this.board;
        for (let x = 0; x < 7; x++) {
            for (let y = 0; y < 6; y++) {
                if (board[x][y] === ConnectFour.PIECES.default) return false;
            }
        }
        return true;
    }

    public get win(): boolean {
        if (this.verticals || this.horizontals || this.diagonals) return true;
        return false;
    }

    private get verticals(): boolean {
        const { board } = this;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 7; y++) {
                const z = board[x][y];
                if ((z !== ConnectFour.PIECES.default) && (z === board[x + 1][y]) && (z === board[x + 2][y]) && (z === board[x + 3][y])) return true;
            }
        }
        return false;
    }

    private get horizontals(): boolean {
        const { board } = this;

        for (let x = 0; x < 6; x++) {
            for (let y = 0; y < 4; y++) {
                const z = board[x][y];
                if ((z !== ConnectFour.PIECES.default) && (z === board[x][y + 1]) && (z === board[x][y + 2]) && (z === board[x][y + 3])) return true;
            }
        }
        return false;
    }

    private get diagonals(): boolean {
        const { board } = this;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 4; y++) {
                const z = board[x][y];
                if ((z !== ConnectFour.PIECES.default) && (z === board[x + 1][y + 1]) && (z === board[x + 2][y + 2]) && (z === board[x + 3][y + 3])) return true;
            }
        }
        for (let x = 3; x < 6; x++) {
            for (let y = 0; y < 4; y++) {
                const z = board[x][y];
                if ((z !== ConnectFour.PIECES.default) && (z === board[x - 1][y + 1]) && (z === board[x - 2][y + 2]) && (z === board[x - 3][y + 3])) return true;
            }
        }
        return false;
    }
}

export class HangmanGame {
    public readonly splitWord: string[];
    public readonly guesses: string[] = [];
    public incorrect = 0;

    public constructor(public readonly word: string) {
        this.word = word.toLowerCase();
        this.splitWord = word.split('');
    }

    public get board(): string {
        const h = (num: number, emoji: string): string => this.incorrect >= num ? emoji : ' ';
        const p = (num: number): '-' | '+' => this.incorrect >= num ? '-' : '+';

        const str = stripIndents`
            ${p(1)}  ----------
            ${p(1)} |          |
            ${p(2)} |          |
            ${p(3)} |         ${h(1, Hangman.EMOJIS.HEAD)} 
            ${p(4)} |       ${h(3, Hangman.EMOJIS.LEFT_HAND)}${h(2, `${this.incorrect === 2 ? ' ' : ''}${Hangman.EMOJIS.SHIRT}`)}${h(4, Hangman.EMOJIS.RIGHT_HAND)} 
            ${p(5)} |         ${h(5, Hangman.EMOJIS.PANTS)} 
            ${p(6)} |        ${h(6, Hangman.EMOJIS.SHOE)}${h(7, Hangman.EMOJIS.SHOE)}
            ${p(7)} |
            ${p(7)} -------------`;

        return codeBlock('diff', str);
    }

    public get guessed(): string {
        return this.guesses.join(' ');
    }

    public get formattedWord(): string {
        return this.splitWord
            .map(w => {
                if (this.guesses.includes(w) || /[^a-z]/i.test(w)) return w;
                return String.raw`\_`;
            })
            .join(' ');
    }

    public get incorrectGuesses(): string[] {
        return this.guesses.filter(w => !this.splitWord.includes(w));
    }
}

export class TicTacToeGame {
    public readonly board: MessageButtonRow[] = [];
    public readonly players: User[] = [];

    public constructor(public readonly message: Message, public interaction: ButtonInteraction) {
        this.message = message;
        this.interaction = interaction;
    }

    public addPlayers(...players: User[]) {
        this.players.push(...players);
        return this;
    }

    public async makeMove(player: User, firstPlayer: User): Promise<void> {
        const filter = (i: ButtonInteraction) => {
            const button = this.findButton(i.customId);
            return button.label === '\u200b' && player.id === i.user.id;
        };

        const opponent = this.getOtherPlayer(player);

        const move = await this.message.awaitMessageComponent({ filter, time: 20000 }).catch(() => null);

        if (!move) {
            await this.interaction.editReply({
                content: TicTacToe.MESSAGES.forfeit(player, opponent),
                components: this.disableEmptyButtons()
            });

            return null;
        }

        await move.update({
            content: TicTacToe.MESSAGES.turn(firstPlayer, this.getOtherPlayer(firstPlayer), opponent.bot ? player : opponent),
            components: this.updateBoard(move.customId, player.id === firstPlayer.id)
        });

        this.interaction = move;
    }

    public getOtherPlayer(player: User) {
        return this.players.find(u => u.id !== player.id);
    }

    public createBoard() {
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

        return this;
    }

    public updateBoard(id: string, first = true) {
        const button = this.findButton(id);

        button
            .setLabel(first ? TicTacToe.EMOJIS.O : TicTacToe.EMOJIS.X)
            .setStyle(first ? TicTacToe.STYLES.O : TicTacToe.STYLES.X)
            .setDisabled(true);

        return this.board;
    }

    public get arrayBoard() {
        return this.board.map(r => r.components.map(c => {
            switch (c.label) {
                case '\u200b':
                    return '_';
                case TicTacToe.EMOJIS.O:
                    return 'o';
                case TicTacToe.EMOJIS.X:
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

    public disableEmptyButtons() {
        for (const row of this.board) {
            for (const button of row.components) {
                if (button.label === '\u200b') button.setDisabled(true);
            }
        }

        return this.board;
    }
}

export class TriviaGame {
    public scores: Record<string, number> = {};

    public get scorelist() {
        const scores = Object
            .entries(this.scores)
            .sort((a, b) => b[1] - a[1]);

        if (!scores.length) return null;

        return scores;
    }

    public get formattedScores() {
        const scores = this.scorelist;

        const longest = scores.sort((a, b) => b[0].length - a[0].length)[0][0];

        const padLength = (str: string) => (longest.length - str.length) + 1;

        return scores
            .sort((a, b) => b[1] - a[1])
            .map(
                e =>
                    `${e[0]}${': '.padEnd(e[0] !== longest
                        ? padLength(e[0]) + 1
                        : padLength(e[0]))}${e[1]}`
            )
            .join('\n');
    }

    public get renderedScoreboard() {
        return codeBlock('glsl', `# Scoreboard\n${this.formattedScores}`);
    }

    public async getQuestions(category: number): Promise<{ questions: string[]; answers: string[][] }> {
        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);

        await doc.useServiceAccountAuth({
            client_email: process.env.SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.SERVICE_ACCOUNT_KEY.replaceAll(String.raw`\n`, '\n')
        });

        await doc.loadInfo();

        const list = doc.sheetsByIndex[category];
        const rows = await list.getRows();

        const questions = [];
        const answers = [];

        for (const row of rows) {
            questions.push(row.Question);
            answers.push(row.Answer.split('\n'));
        }

        return { questions, answers };
    }
}