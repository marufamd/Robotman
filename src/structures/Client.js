require('dotenv').config();

const { AkairoClient, CommandHandler, ListenerHandler, SequelizeProvider, InhibitorHandler } = require('discord-akairo');
const ClientUtil = require('./ClientUtil');
const { join } = require('path');

const Sequelize = require('sequelize');
const Database = require('./Database');
const { plural } = require('../util');
const db = new Sequelize(process.env.DATABASE_URL, { logging: false });

module.exports = class Robotman extends AkairoClient {
    constructor(options) {
        super({ ownerID: process.env.OWNER }, options);

        this.logger = require('../util/logger');
        this.util = new ClientUtil(this);
        this.db = new Database(db);

        this.settings = new SequelizeProvider(this.db.settings, { idColumn: 'guild', dataColumn: 'settings' });

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

        this.commandHandler.resolver.addType('commandCategory', (_, phrase) => {
            if (!phrase) return null;
            if (this.commandHandler.categories.has(phrase)) return this.commandHandler.categories.get(phrase);
            return null;
        });

        this.commandHandler.resolver.addType('clientChannel', (_, phrase) => {
            if (!phrase) return null;
            if (this.channels.cache.has(phrase)) return this.channels.cache.get(phrase);
            return null;
        });

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
        this.db.init();
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