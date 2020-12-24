require('dotenv').config();

const { AkairoClient, CommandHandler, ListenerHandler, SequelizeProvider, InhibitorHandler } = require('discord-akairo');
const { join } = require('path');
const Sequelize = require('sequelize');

const ClientUtil = require('./ClientUtil');
const ConfigProvider = require('./ConfigProvider');
const Database = require('./Database');
const { plural } = require('../util');
const TagsProvider = require('./TagsProvider');

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

        this.commandHandler.resolver
            .addType('commandCategory', (_, phrase) => {
                if (this.commandHandler.categories.has(phrase)) return this.commandHandler.categories.get(phrase);
                return null;
            })
            .addType('clientChannel', (_, phrase) => {
                if (this.channels.cache.has(phrase)) return this.channels.cache.get(phrase);
                return null;
            })
            .addType('parsedDate', (_, phrase) => {
                let parsed = Date.parse(phrase);

                if (isNaN(parsed)) {
                    const month = phrase.match(/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)/gi);
                    const day = phrase.match(/[0-9]{1,2}(st|th|nd|rd|\s)/gi);
                    const year = phrase.match(/[0-9]{4}/g);

                    if (month && day && year) {
                        parsed = `${month[0]} ${day[0].replace(/(st|nd|rd|th)/gi, '')} ${year[0]}`;
                    } else {
                        return null;
                    }
                }

                return new Date(parsed);
            })
            .addType('tag', (message, phrase) => this.tags.get(phrase.toLowerCase(), message.guild.id) ?? null);

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

        this.db.init(true);
        this.settings.init();

        this.commandHandler.useListenerHandler(this.listenerHandler);
        this.commandHandler.useInhibitorHandler(this.inhibitorHandler);

        this.listenerHandler.setEmitters({
            commandHandler: this.commandHandler,
            inhibitorHandler: this.inhibitorHandler,
            listenerHandler: this.listenerHandler
        });

        this.loadHandlers('commandHandler', 'listenerHandler', 'inhibitorHandler');

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

    log(text, type, options) {
        return this.logger.log(text, type, options);
    }

    get owner() {
        return this.users.cache.get(this.ownerID);
    }
};