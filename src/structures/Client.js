require('dotenv').config();

const { AkairoClient, CommandHandler, ListenerHandler, SequelizeProvider, InhibitorHandler } = require('discord-akairo');
const { join } = require('path');
const Sequelize = require('sequelize');
const { RecurrenceRule, scheduleJob } = require('node-schedule');

const ClientUtil = require('./ClientUtil');
const Database = require('./Database');
const ConfigProvider = require('./ConfigProvider');
const TagsProvider = require('./TagsProvider');

const { plural } = require('../util');
const types = require('../util/types');
const InteractionHandler = require('./InteractionHandler');

const db = new Sequelize(process.env.DATABASE_URL, { logging: false });

module.exports = class Robotman extends AkairoClient {
    constructor(options) {
        super({ ownerID: process.env.OWNER }, options);

        this.logger = require('../util/logger');
        this.util = new ClientUtil(this);
        this.db = new Database(db);

        this.settings = new SequelizeProvider(this.db.settings, { idColumn: 'guild', dataColumn: 'settings' });
        this.config = new ConfigProvider(this.db.config);

        this.tags = new TagsProvider(this.db.tags);

        this.aki = new Set();
        this.hangman = new Set();
        this.trivia = new Set();
        this.connectFour = new Set();

        this.interactionHandler = new InteractionHandler(this);

        this.commandHandler = new CommandHandler(this, {
            directory: join(__dirname, '..', 'commands'),
            automateCategories: true,
            prefix: m => this.settings.get(m.guild.id, 'prefix', process.env.CLIENT_PREFIX),
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

        for (const [name, fn] of Object.entries(types)) this.commandHandler.resolver.addType(name, fn);

        this.listenerHandler = new ListenerHandler(this, {
            directory: join(__dirname, '..', 'listeners'),
            automateCategories: true
        });

        this.inhibitorHandler = new InhibitorHandler(this, {
            directory: join(__dirname, '..', 'inhibitors'),
        });

        this.ratelimits = 0;
        this.schedule = null;
        this.development = process.env.NODE_ENV === 'development';
    }

    init() {
        this.log('Initializing...');

        this.db.init();
        this.settings.init();

        this.commandHandler.useListenerHandler(this.listenerHandler);
        this.commandHandler.useInhibitorHandler(this.inhibitorHandler);

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler,
            websocket: this.ws
        });

        this.loadHandlers('commandHandler', 'listenerHandler', 'inhibitorHandler');
        this.loadSchedule();

        this.login();
    }

    loadHandlers(...handlers) {
        for (const handler of handlers) {
            if (!(handler in this)) continue;
            this[handler].loadAll();

            const modules = this[handler].modules;
            const item = handler.replace('Handler', '');

            this.log(`Loaded ${modules.size} ${plural(item, modules.size)}${modules.size ? `:\`\`\`css\n${modules.map(m => m.id).join(', ')}\`\`\`` : ''}`);
        }
    }

    async loadSchedule() {
        const schedule = await this.config.get('schedule');
        if (!schedule?.length) return;

        const rule = new RecurrenceRule();
        rule.dayOfWeek = schedule[0];
        rule.hour = schedule[1];
        rule.minute = schedule[2];

        const func = () => this.commandHandler.modules.get('release-list').exec();

        if (this.schedule) this.schedule.cancel();
        this.schedule = scheduleJob(rule, func);

        this.log('Loaded Schedule');
    }

    log(text, type, options) {
        return this.logger.log(text, type, options);
    }

    get owner() {
        return this.users.cache.get(this.ownerID);
    }
};