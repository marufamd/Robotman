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