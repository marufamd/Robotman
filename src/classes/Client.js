require('dotenv').config();

const { AkairoClient, CommandHandler, ListenerHandler } = require('discord-akairo');
const ClientUtil = require('./ClientUtil');
const { join } = require('path');

class Robotman extends AkairoClient {
    constructor(options) {
        super({ ownerID: process.env.OWNER }, options);

        this.logger = require('../util/logger');
        this.util = new ClientUtil(this);

        this.commandHandler = new CommandHandler(this, {
            directory: join(__dirname, '..', 'core', 'commands'),
            automateCategories: true,
            prefix: '-',//m => this.settings.get(m.guild.id, 'prefix', process.env.CLIENT_PREFIX),
            aliasReplacement: /-/g,
            handleEdits: true,
            commandUtil: true,
            ignorePermissions: this.ownerID
        });

        this.listenerHandler = new ListenerHandler(this, {
            directory: join(__dirname, '..', 'core', 'listeners'),
            automateCategories: true
        });

        this.ratelimits = 0;
        this.schedule = null;
        this.development = process.env.NODE_ENV === 'development';
    }

    init() {
        this.load('commandHandler');
        this.load('listenerHandler');
        this.login();
    }

    load(handler) {
        this[handler].loadAll();
        const modules = this[handler].modules.size;
        const item = handler.replace('Handler', '');
        this.log(`Loaded ${modules} ${modules === 1 ? item : `${item}s`}`);
    }

    log(text, type, options) {
        return this.logger.log(text, type, options);
    }
}

module.exports = Robotman;