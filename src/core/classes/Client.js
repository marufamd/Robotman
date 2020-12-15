require("dotenv").config();

const { Client } = require("discord.js");
const { RecurrenceRule, scheduleJob } = require("node-schedule");

const Handler = require("./Handler");
const GuildSettingsManager = require(`../../database/managers/GuildSettingsManager`);
const ClientUtil = require("../../database/managers/ClientUtil");
const { settings, util } = require("../../database");

require("../extensions/Message");
require("../extensions/Guild");
require("../extensions/User");

module.exports = class Robotman extends Client {
    constructor(options) {
        super(options);

        this.logger = require("../../util/logger");
        this.handler = new Handler(this);
        this.settings = new GuildSettingsManager(this, settings);
        this.util = new ClientUtil(this, util);

        this.games = {
            trivia: new Map(),
            connect4: new Map(),
            aki: new Set(),
            hangman: new Set()
        };

        this.ratelimits = 0;
        this.schedule = null;
        this.owner = null;
        this.development = process.env.NODE_ENV === "development";
    }

    init() {
        this.log("Initalizing bot...", "info");
        super.login().catch(e => this.log(e, "error"));

        this.handler.loadCommands();
        this.handler.loadListeners();
        this.loadSchedule();
    }

    async loadSchedule() {
        const schedule = await this.util.get("scheduleTime");
        if (!schedule.length) return;

        const rule = new RecurrenceRule();
        rule.dayOfWeek = schedule[0];
        rule.hour = schedule[1];
        rule.minute = schedule[2];

        const func = () => this.handler.commands.get("releaselist").run();

        if (this.schedule) this.schedule.cancel();
        this.schedule = scheduleJob(rule, func);
    }

    log(text, type, options) {
        return this.logger.log(text, type, options);
    }

    get invite() {
        return this.generateInvite({ permissions: process.env.CLIENT_PERMISSIONS });
    }
};