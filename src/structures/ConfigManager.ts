import { Sql } from 'postgres';

export interface BotStats {
    aki: number;
    hangman: number;
    trivia: number;
    connect_four: number;
    commands_run: number;
}

export interface BotConfig extends BotStats {
    webhook_url: string | null;
    schedule: number[] | null;
    blacklist: string[] | null;
}

export default class ConfigManager {
    public constructor(public sql: Sql<any>, public readonly table: string) {
        this.sql = sql;
        this.table = table;
    }

    public async init() {
        const [data] = await this.sql`
        select * from ${this.sql(this.table)}
        where id = 1
        `;

        if (!data) await this.sql`insert into bot_info default values`;
    }

    public async get<K extends keyof BotConfig>(key: K): Promise<BotConfig[K]> {
        const [data] = await this.sql`
        select ${this.sql(key)} from ${this.sql(this.table)}
        where id = 1
        `;

        return data[key];
    }

    public async getStats() {
        const [data] = await this.sql<BotStats>`
        select ${this.sql([
            'aki',
            'hangman',
            'trivia',
            'connect_four',
            'commands_run'
        ])} from ${this.sql(this.table)}
        where id = 1
        `;

        return data;
    }

    public set<K extends keyof BotConfig>(key: K, value: BotConfig[K]) {
        return this.sql`
            update ${this.sql(this.table)} set
            ${this.sql({ [key]: value }, key)}
            where id = 1
            `;
    }

    public stat<K extends keyof BotStats>(key: K) {
        return this.sql`
            update ${this.sql(this.table)} set
            ${this.sql(key)} = ${this.sql(key)} + 1
            where id = 1
            `;
    }
}