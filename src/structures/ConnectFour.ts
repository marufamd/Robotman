import type { User } from 'discord.js';
import { connectFour } from '../util/constants';

const { pieces, nums } = connectFour;

export default class ConnectFour {
    public readonly players: User[] = [];
    public readonly board: string[][] = [];

    public makeBoard() {
        for (let i = 0; i < 6; i++) this.board.push(Array(7).fill(pieces.default));
        this.board.push(nums);
        return this;
    }

    public get currentBoard() {
        return this.board.map(r => r.join('')).join('\n');
    }

    public addPiece(num: number, piece: 'yellow' | 'red') {
        let success = false;

        for (let i = this.board.length - 2; i >= 0; i--) {
            const row = this.board[i];
            const place = row[num - 1];

            if (place !== pieces.default) continue;

            row[num - 1] = pieces[piece];
            success = true;

            break;
        }

        return success;
    }

    public get boardFull() {
        const board = this.board;
        for (let x = 0; x < 7; x++) {
            for (let y = 0; y < 6; y++) if (board[x][y] !== pieces.default) return false;
        }
        return true;
    }

    public get win() {
        if (this.verticals || this.horizontals || this.diagonals) return true;
        return false;
    }

    private get verticals() {
        const { board } = this;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 7; y++) {
                const z = board[x][y];
                if ((z !== pieces.default) && (z === board[x + 1][y]) && (z === board[x + 2][y]) && (z === board[x + 3][y])) return true;
            }
        }
        return false;
    }

    private get horizontals() {
        const { board } = this;

        for (let x = 0; x < 6; x++) {
            for (let y = 0; y < 4; y++) {
                const z = board[x][y];
                if ((z !== pieces.default) && (z === board[x][y + 1]) && (z === board[x][y + 2]) && (z === board[x][y + 3])) return true;
            }
        }
        return false;
    }

    private get diagonals() {
        const { board } = this;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 4; y++) {
                const z = board[x][y];
                if ((z !== pieces.default) && (z === board[x + 1][y + 1]) && (z === board[x + 2][y + 2]) && (z === board[x + 3][y + 3])) return true;
            }
        }
        for (let x = 3; x < 6; x++) {
            for (let y = 0; y < 4; y++) {
                const z = board[x][y];
                if ((z !== pieces.default) && (z === board[x - 1][y + 1]) && (z === board[x - 2][y + 2]) && (z === board[x - 3][y + 3])) return true;
            }
        }
        return false;
    }
}