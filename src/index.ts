// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
require('dotenv').config();

import 'reflect-metadata';

import { assignOptions, Command, Listener } from '#util/commands';
import { PRODUCTION, ScheduleTime } from '#util/constants';
import '#util/extensions';
import { log } from '#util/logger';
import {
    Client,
    Collection,
    Constants,
    Intents,
    Options
} from 'discord.js';
import { RecurrenceRule, scheduleJob } from 'node-schedule';
import { join } from 'node:path';
import postgres, { Notice } from 'postgres';
import readdirp from 'readdirp';
import { container } from 'tsyringe';

const client = new Client({
    makeCache: Options.cacheWithLimits({
        MessageManager: 50
    }),
    messageCacheLifetime: 600,
    messageSweepInterval: 600,
    allowedMentions: {
        parse: ['users']
    },
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES
    ]
});

const sql = postgres(process.env.POSTGRES_URL, {
    onnotice: (notice: Notice) => {
        if (/relation "(.*)" already exists/gi.test(notice.message)) return;
        return log(
            notice,
            'info',
            { code: true },
            { title: 'Postgres' }
        );
    }
});

const commands = new Collection<string, Command>();

container.register(Client, { useValue: client });
container.register('sql', { useValue: sql });
container.register('commands', { useValue: commands });

async function init() {
    log('Initializing...');

    client
        .on(Constants.Events.ERROR, e => log(e.stack, 'error', { ping: true }))
        .on(Constants.Events.WARN, info => log(info, 'warn'))
        .on(Constants.Events.SHARD_RECONNECTING, () => log('Attempting to reconnect...', 'info'))
        .on(Constants.Events.SHARD_RESUME, () => log('Reconnected'));

    await sql.begin(async sql => {
        await sql`create table if not exists auto_responses(
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
                uses        integer default 0,
                wildcard    boolean,
                embed       boolean,
                color       integer default 0
            );`;
    });

    const commandFiles = readdirp(join(__dirname, 'commands'), { fileFilter: '*.js' });
    const listenerFiles = readdirp(join(__dirname, 'listeners'), { fileFilter: '*.js' });

    for await (const commandFile of commandFiles) {
        const command = container.resolve<Command>((await import(commandFile.fullPath)).default);

        assignOptions(command, commandFile.fullPath);

        commands.set(command.options.name, command);
    }

    for await (const listenerFile of listenerFiles) {
        const listener = container.resolve<Listener>((await import(listenerFile.fullPath)).default);

        client[listener.event === 'ready' ? 'once' : 'on'](listener.event, listener.handle.bind(listener));
    }

    log(`Loaded ${commands.size} commands`);

    if (PRODUCTION && commands.has('release-list')) {
        scheduleJob(
            new RecurrenceRule(null, null, null, ScheduleTime.DAY, ScheduleTime.HOUR, ScheduleTime.MINUTE),
            () => commands.get('release-list').exec()
        );
    }

    await client.login();
}

void init().catch(e => log(e, 'error'));

process.on('unhandledRejection', (e: any) => {
    if (/The server did not return the correct signature/g.test(e.message)) return;
    log(`Unhandled Promise Rejection: ${e.stack}`, 'error', { ping: true });
});