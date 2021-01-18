import { stripIndents } from 'common-tags';
import { emojis as constantEmojis } from '../util/constants';

const { hangman: emojis } = constantEmojis;

export default class Hangman {
    public readonly splitWord: string[];
    public readonly guesses: string[] = [];
    public incorrect = 0;

    public constructor(public readonly word: string) {
        this.word = word.toLowerCase();
        this.splitWord = word.split('');
    }

    public get board() {
        const h = (num: number, emoji: string) => this.incorrect >= num ? emoji : ' ';
        const p = (num: number) => this.incorrect >= num ? '-' : '+';
        const arr = [
            '```diff',
            stripIndents`
            ${p(1)}  ----------
            ${p(1)} |          |
            ${p(2)} |          |
            ${p(3)} |         ${h(1, emojis.head)} 
            ${p(4)} |       ${h(3, emojis.leftHand)}${h(2, `${this.incorrect === 2 ? ' ' : ''}${emojis.shirt}`)}${h(4, emojis.rightHand)} 
            ${p(5)} |         ${h(5, emojis.pants)} 
            ${p(6)} |        ${h(6, emojis.shoe)}${h(7, emojis.shoe)}
            ${p(7)} |
            ${p(7)} -------------`,
            '```'
        ];

        return arr.join('\n');
    }

    public get guessed() {
        return this.guesses.join(' ');
    }

    public get formattedWord() {
        return this.splitWord
            .map(w => {
                if (this.guesses.includes(w) || /[^a-z]/i.test(w)) return w;
                return String.raw`\_`;
            })
            .join(' ');
    }

    public get incorrectGuesses() {
        return this.guesses
            .filter(w => !this.splitWord.includes(w))
            .join(' ');
    }
}