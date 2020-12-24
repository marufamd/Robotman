const { GoogleSpreadsheet } = require("google-spreadsheet");

class Trivia {
    constructor(host) {
        this.host = host;
        this.scores = {};
    }

    get scorelist() {
        const scores = Object.entries(this.scores).sort((a, b) => b[1] - a[1]);
        if (!scores.length) return null;
        return scores;
    }

    formatScores(scores) {
        const longest = scores.sort((a, b) => b[0].length - a[0].length)[0][0];
        const padLength = (str) => (longest.length - str.length) + 1;
        scores = scores.sort((a, b) => b[1] - a[1]);
        return scores
            .map(e => `${e[0]}${": ".padEnd(e[0] !== longest ? padLength(e[0]) + 1 : padLength(e[0]))}${e[1]}`)
            .join("\n");
    }

    makeScoreboard(scores) {
        const arr = [
            "```glsl",
            "# Scoreboard:",
            this.formatScores(scores),
            "```"
        ];
        return arr.join("\n");
    }

    async getQuestions(category) {
        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET);
        await doc.useServiceAccountAuth({
            client_email: process.env.SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.SERVICE_ACCOUNT_KEY.replaceAll(String.raw`\n`, "\n"),
        });

        await doc.loadInfo();

        const list = doc.sheetsByIndex[category];
        const rows = await list.getRows();

        const questions = [];
        const answers = [];

        for (const row of rows) {
            questions.push(row.Question);
            answers.push(row.Answer.split("\n"));
        }

        return { questions, answers };
    }
}

module.exports = Trivia;