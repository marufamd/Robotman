import { GoogleSpreadsheet } from 'google-spreadsheet';
import { codeblock } from '../util';

const sort = (a: any[], b: any[]) => b[1] - a[1];

interface TriviaData {
    questions: string[];
    answers: Array<string[]>;
}

export default class Trivia {
    public scores: Record<string, any> = {};

    public constructor(public readonly host: string) {
        this.host = host;
    }

    public get scorelist(): [string, any][] {
        const scores = Object.entries(this.scores).sort(sort);
        if (!scores.length) return null;
        return scores;
    }

    public get formattedScores(): string {
        const scores = this.scorelist;
        const longest = scores.sort((a: any[], b: any[]) => b[0].length - a[0].length)[0][0];
        const padLength = (str: string) => (longest.length - str.length) + 1;
        return scores
            .sort(sort)
            .map((e: any[]) => `${e[0]}${': '.padEnd(e[0] !== longest ? padLength(e[0]) + 1 : padLength(e[0]))}${e[1]}`)
            .join('\n');
    }

    public get renderedScoreboard() {
        return codeblock(`# Scoreboard\n${this.formattedScores}`, 'glsl');
    }

    public async getQuestions(category: number): Promise<TriviaData> {
        const doc = new GoogleSpreadsheet(process.env.SPREADSHEET);
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