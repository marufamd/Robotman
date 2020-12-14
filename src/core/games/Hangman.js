const { stripIndents } = require("common-tags");
const { hangmanEmojis: emojis } = require("../../util/constants");

class Hangman {
    constructor(word) {
        this.guesses = [];
        this.incorrect = 0;
        this.word = word;
        this.splitWord = word.split("");
    }

    get board() {
        const h = (num, emoji) => this.incorrect >= num ? emoji : " ";
        const p = num => this.incorrect >= num ? "-" : "+";
        const arr = [
            "```diff",
            stripIndents`
            ${p(1)}  ----------
            ${p(1)} |          |
            ${p(2)} |          |
            ${p(3)} |         ${h(1, emojis.head)} 
            ${p(4)} |       ${h(3, emojis.leftHand)}${h(2, `${this.incorrect === 2 ? " " : ""}${emojis.shirt}`)}${h(4, emojis.rightHand)} 
            ${p(5)} |         ${h(5, emojis.pants)} 
            ${p(6)} |        ${h(6, emojis.shoe)}${h(7, emojis.shoe)}
            ${p(7)} |
            ${p(7)} -------------`,
            "```"
        ];

        return arr.join("\n");
    }

    get guessed() {
        return this.guesses.join(" ");
    }

    get formattedWord() {
        return this.splitWord.map(w => {
            if (this.guesses.includes(w) || /[^a-z]/i.test(w)) return w;
            return String.raw`\_`;
        }).join(" ");
    }

    get incorrectGuesses() {
        return this.guesses.filter(w => !this.splitWord.includes(w)).join(" ");
    }
}

module.exports = Hangman;