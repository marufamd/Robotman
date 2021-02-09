// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
require('dotenv').config();

import { AkairoClient, CommandHandler, InhibitorHandler, ListenerHandler } from 'discord-akairo';
import type { APIMessage } from 'discord-api-types';
import type { Message, MessageEmbed, MessageEmbedOptions } from 'discord.js';
import { Job, RecurrenceRule, scheduleJob } from 'node-schedule';
import { join } from 'path';
import postgres, { Notice, Sql } from 'postgres';
import { plural } from '../util';
import argumentTypes from '../util/argument-types';
import type RobotmanEmbed from '../util/embed';
import Logger from '../util/logger';
import ClientUtil from './ClientUtil';
import ConfigManager from './ConfigManager';
import type Interaction from './Interaction';
import InteractionHandler, { APICommandData } from './InteractionHandler';
import SettingsProvider from './SettingsProvider';
import TagsProvider from './TagsProvider';

const loaded = (handler: CommandHandler | ListenerHandler | InhibitorHandler): string => `• ${handler.modules.size} ${plural(handler.constructor.name.slice(0, 7).toLowerCase(), handler.modules.size)}`;

declare module 'discord.js' {
    interface Message {
        client: RobotmanClient;
    }
}

declare module 'discord-akairo' {
    interface AkairoClient {
        log: typeof Logger.log;
        sql: Sql<any>;
        util: ClientUtil;
        config: ConfigManager;
        settings: SettingsProvider;
        tags: TagsProvider;
        commandHandler: CommandHandler;
        interactionHandler: InteractionHandler;
        listenerHandler: ListenerHandler;
        inhibitorHandler: InhibitorHandler;
        ratelimits: number;
        development: boolean;
        loadSchedule(): Promise<void>;
    }

    export type ArgumentTypeCasterWithInteraction = (message: Message | Interaction, phrase: string) => any;

    interface ClientUtil {
        embed(data?: MessageEmbed | MessageEmbedOptions): RobotmanEmbed;
        getDescription(command: Command): string;
        getExtended(command: Command, prefix: string): string;
        formatPrefix(message: Message): string;
        formatExamples(command: Command, prefix: string): string;
        getPrefix(message: Message): string;
    }

    interface CommandHandler {
        runCooldowns(message: Message | Interaction, command: Command): boolean;
    }

    interface Command {
        mod: boolean;
        disableHelp: boolean;
        interactionOptions: APICommandData;
        exec(message?: Message, args?: Record<string, any>): any;
        interact(interaction: Interaction): Promise<boolean | Message | APIMessage>;
    }
}

export default class RobotmanClient extends AkairoClient {
    public log = Logger.log;
    public util = new ClientUtil(this);
    public development = process.env.NODE_ENV === 'development';
    public ratelimits = 0;
    public schedule: Job;

    public sql = postgres(process.env.DATABASE_URL, {
        onnotice: (notice: Notice) => {
            if (/relation "(.*)" already exists/gi.test(notice.message)) return;
            return this.log(notice, 'info', { code: true }, { title: 'Postgres' });
        }
    });

    public config = new ConfigManager(this.sql, 'bot_info');
    public settings = new SettingsProvider(this.sql, 'guild_settings', 'guild');
    public tags = new TagsProvider(this.sql, 'tags');

    public commandHandler: CommandHandler = new CommandHandler(this, {
        directory: join(__dirname, '..', 'commands'),
        automateCategories: true,
        prefix: m => this.settings.get(m.guild.id, 'prefix', process.env.BOT_PREFIX),
        aliasReplacement: /-/g,
        handleEdits: true,
        commandUtil: true,
        defaultCooldown: 2000,
        ignorePermissions: this.ownerID,
        argumentDefaults: {
            prompt: {
                modifyStart: (_, text) => `${text}\n\nTo cancel the command, type \`cancel\`.`,
                modifyRetry: (_, text) => `${text}\n\nTo cancel the command, type \`cancel\`.`,
                timeout: 'You took too long to respond. The command has been cancelled.',
                ended: 'You\'ve retried too many times. The command has been cancelled.',
                cancel: 'Cancelled the command.',
                retries: 3,
                time: 30000
            }
        }
    });

    public interactionHandler: InteractionHandler = new InteractionHandler(this);

    public listenerHandler: ListenerHandler = new ListenerHandler(this, {
        directory: join(__dirname, '..', 'listeners'),
        automateCategories: true
    });

    public inhibitorHandler: InhibitorHandler = new InhibitorHandler(this, {
        directory: join(__dirname, '..', 'inhibitors')
    });

    public constructor() {
        super({ ownerID: process.env.BOT_OWNER }, {
            messageCacheMaxSize: 50,
            messageCacheLifetime: 600,
            messageSweepInterval: 600,
            messageEditHistoryMaxSize: 0,
            allowedMentions: {
                parse: ['users']
            },
            ws: {
                intents: [
                    'GUILDS',
                    'GUILD_MEMBERS',
                    'GUILD_MESSAGES'
                ]
            }
        });

        for (const [name, fn] of Object.entries(argumentTypes)) this.commandHandler.resolver.addType(name, fn);
    }

    public async loadSchedule(): Promise<void> {
        const schedule = await this.config.get('schedule');
        if (!schedule?.length) return;

        const rule = new RecurrenceRule();
        rule.dayOfWeek = schedule[0];
        rule.hour = schedule[1];
        rule.minute = schedule[2];

        const func = () => this.commandHandler.modules.get('release-list').exec();

        if (this.schedule instanceof Job) this.schedule.cancel();
        this.schedule = scheduleJob(rule, func);
    }

    private async initDB(): Promise<void> {
        await this.sql.begin(async sql => {
            await sql`create table if not exists bot_info(
                id           serial primary key,
                aki          integer default 0,
                hangman      integer default 0,
                trivia       integer default 0,
                connect_four integer default 0,
                commands_run integer default 0,
                webhook_url  text,
                schedule     smallint array[3],
                blacklist    varchar(25)[]
            )`;

            await sql`create table if not exists guild_settings(
                guild             varchar(25) primary key,
                prefix            varchar(5),
                disabled_commands text[]
            )`;

            await sql`create table if not exists tags(
                id          serial primary key,
                name        text,
                guild       varchar(25),
                content     text,
                attachments text[] default array[]::text[],
                aliases     text[] default array[]::text[],
                author	    varchar(25),
                editor      varchar(25),
                created_at  timestamp default current_timestamp,
                updated_at  timestamp,
                uses        integer default 0
            );`;
        });
    }

    public async init(): Promise<void> {
        process.on('unhandledRejection', (e: any) => {
            if (/The server did not return the correct signature/g.test(e.message)) return;
            this.log(`Unhandled Promise Rejection: ${e.stack}`, 'error', { ping: true });
        });

        this.log('Initializing...');

        this
            .on('error', (e: any) => this.log(e.stack, 'error', { ping: true }))
            .on('warn', (info: string) => this.log(info, 'warn'))
            .on('shardReconnecting', () => this.log('Attempting to reconnect...', 'info'))
            .on('shardResume', () => this.log('Reconnected'));

        await this.initDB();
        await this.config.init();
        await this.settings.init();

        this.commandHandler
            .useListenerHandler(this.listenerHandler)
            .useInhibitorHandler(this.inhibitorHandler);

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            ws: this.ws
        });

        this.commandHandler.loadAll();
        this.listenerHandler.loadAll();
        this.inhibitorHandler.loadAll();

        this.commandHandler.on('commandStarted', () => void this.config.stat('commands_run'));

        this.log([
            'Loaded',
            loaded(this.commandHandler),
            loaded(this.listenerHandler),
            loaded(this.inhibitorHandler)
        ]);

        await this.loadSchedule();

        void this.login();
    }
}