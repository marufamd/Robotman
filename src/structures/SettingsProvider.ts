import { Provider } from 'discord-akairo';
import type { Guild } from 'discord.js';
import type { Sql } from 'postgres';
import { resolveGuild } from '../util';

export interface GuildSettings {
    guild: string;
    prefix: string;
    disabled_commands: string[];
}

export default class SettingsProvider extends Provider {
    public constructor(public sql: Sql<any>, private readonly table: string, private readonly idColumn: string) {
        super();

        this.sql = sql;
        this.table = table;
        this.idColumn = idColumn;
    }

    public async init(): Promise<void> {
        const rows = await this.sql`select * from ${this.sql(this.table)}`;
        for (const row of rows) this.items.set(row.guild, row as GuildSettings);
    }

    public get<K extends keyof GuildSettings, D = undefined>(guild: string | Guild, key: K, defaultValue: D): GuildSettings[K] | D {
        const id = resolveGuild(guild);
        if (this.items.has(id)) return this.items.get(id)[key] ?? defaultValue;
        return defaultValue;
    }

    public async set<K extends keyof GuildSettings>(guild: string | Guild, key: K, value: any): Promise<GuildSettings> {
        const id = resolveGuild(guild);
        const has = this.items.has(id);

        const data = has ? this.items.get(id) : {};

        data[key] = value;
        this.items.set(id, data);

        const obj = {
            [key]: value
        };

        if (has) {
            const [row] = await this.sql<GuildSettings>`
            update ${this.sql(this.table)} set
            ${this.sql(obj, key)}
            where ${this.sql(this.idColumn)} = ${id}
            returning *
            `;

            return row;
        }

        obj[this.idColumn] = id;

        const [row] = await this.sql<GuildSettings>`
            insert into ${this.sql(this.table)}
            ${this.sql(obj, key, this.idColumn)}
            returning *
            `;

        return row;
    }

    public async delete<K extends keyof GuildSettings>(guild: string | Guild, key: K): Promise<GuildSettings> {
        const id = resolveGuild(guild);
        const data = this.items.get(id);

        if (typeof data === 'undefined') throw new Error(`Settings for guild ${id} do not exist.`);
        delete data[key];

        const [row] = await this.sql<GuildSettings>`
        update ${this.sql(this.table)} set
        ${this.sql({ [key]: null }, key)}
        where ${this.sql(this.idColumn)} = ${id}
        returning *
        `;

        return row;
    }

    public async clear(guild: string | Guild): Promise<GuildSettings> {
        const id = resolveGuild(guild);
        if (!this.items.has(id)) throw new Error(`Settings for guild ${id} do not exist.`);

        this.items.delete(id);

        const [row] = await this.sql<GuildSettings>`
        delete from ${this.sql(this.table)}
        where ${this.sql(this.idColumn)} = ${id}
        returning *
        `;

        return row;
    }
}