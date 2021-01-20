import type { Guild, Message } from 'discord.js';
import type { Sql } from 'postgres';
import { resolveGuild } from '../util';

export interface Tag {
    name: string;
    guild: string;
    content: string;
    aliases: string[];
    author: string;
    editor: string;
    created_at: Date;
    updated_at: Date;
    uses: number;
}

export default class TagsProvider {
    public constructor(public sql: Sql<any>, public readonly table: string) {
        this.sql = sql;
        this.table = table;
    }

    public async get(name: string, guild: string | Guild): Promise<Tag | null> {
        const id = resolveGuild(guild);

        const [tag] = await this.sql<Tag>`
        select * from tags
        where (name = ${name} or ${name} = any(aliases))
        and guild = ${id}
        `;

        if (!tag) return null;
        return tag;
    }

    public async create(name: string, content: string, message: Message) {
        const exists = await this.get(name, message.guild.id);
        if (exists) return null;

        const obj = {
            name,
            guild: message.guild.id,
            content,
            author: message.author.id
        };

        const [tag] = await this.sql<Tag>`
        insert into ${this.sql(this.table)}
        ${this.sql(obj, 'name', 'guild', 'content', 'author')}
        returning *
        `;

        return tag;
    }

    public async edit(name: string, content: string, message: Message) {
        const obj = {
            content,
            editor: message.author.id,
            updated_at: Date.now()
        };

        const [tag] = await this.sql<Tag>`
        update ${this.sql(this.table)} set
        ${this.sql(obj, 'content', 'editor', 'updated_at')}
        where (name = ${name} or ${name} = any(aliases))
        and guild = ${message.guild.id}
        returning *
        `;

        return tag;
    }

    public async delete(name: string, guild: string | Guild) {
        const id = resolveGuild(guild);

        const [tag] = await this.sql<Tag>`
        delete from ${this.sql(this.table)}
        where (name = ${name} or ${name} = any(aliases))
        and guild = ${id}
        returning *
        `;

        return tag;
    }

    public async increment(name: string, guild: string | Guild) {
        const id = resolveGuild(guild);

        const [uses] = await this.sql<{ uses: number }>`
            update ${this.sql(this.table)} set
            uses = uses + 1
            where (name = ${name} or ${name} = any(aliases))
            and guild = ${id}
            returning uses
            `;

        return uses;
    }
}