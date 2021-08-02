declare module 'aki-api' {
	export type Regions =
		| 'en'
		| 'en_objects'
		| 'en_animals'
		| 'ar'
		| 'cn'
		| 'de'
		| 'de_animals'
		| 'es'
		| 'es_animals'
		| 'fr'
		| 'fr_objects'
		| 'fr_animals'
		| 'il'
		| 'it'
		| 'it_animals'
		| 'jp'
		| 'jp_animals'
		| 'kr'
		| 'nl'
		| 'pl'
		| 'pt'
		| 'ru'
		| 'tr'
		| 'id';

	export interface Guess {
		id: `${number}`;
		name: string;
		id_base: `${number}`;
		proba: number;
		description: string;
		valide_contrainte: `${number}`;
		ranking: `${number}`;
		nsfw: boolean;
		minibase_addable: `${number}`;
		relative_id: `${number}`;
		pseudo: string;
		picture_path: string;
		flag_photo: `${number}`;
		absolute_picture_path: string;
	}

	export const regions: Regions[];

	export class Aki {
		public constructor(region: Regions, safeMode?: boolean);

		public answers: string[] | Guess[];
		public currentStep: number;
		public guessCount: number;
		public progress: number | `${number}`;
		public question: string;

		public start(): Promise<void>;
		public step(answer: number): Promise<void>;
		public back(): Promise<void>;
		public win(): Promise<void>;
	}
}

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
