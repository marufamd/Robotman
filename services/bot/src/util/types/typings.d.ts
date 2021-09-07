declare module 'connect4-ai' {
	export class Connect4AI {
		public constructor(width?: number, height?: number);

		public height: number;
		public width: number;
		public board: Record<number, number[]>;

		public play(column: number): void;
		public play1BasedColumn(column: number): void;
		public playAI(difficulty: 'easy' | 'medium' | 'hard'): number;
		public canPlay(column: number): boolean;
	}
}

declare module 'tictactoe-minimax-ai' {
	export type Piece = 'o' | 'x';

	export interface GameOptions {
		computer: Piece;
		opponent: Piece;
	}

	export function bestMove(board: string[][], options: GameOptions): number;
	export function boardEvaluate(board: string[][]): { status: 'win' | 'loss' | 'tie' | 'none' };
}
