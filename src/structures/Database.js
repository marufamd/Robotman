const { log } = require("../util/logger");

class Database {
    constructor(db) {
        this.db = db;
        this.loadAll();
    }

    init(force = false) {
        this.db
            .authenticate()
            .then(() => this.db.sync({ force }))
            .then(() => log('Initalized database'))
            .catch(e => log(`Error initializing to database: ${e}`, 'error'));
    }

    async loadAll() {
        for (const model of ['Settings', 'Config', 'Tags']) {
            const table = require(`../models/${model}`)(this.db);
            this[model.toLowerCase()] = table;
        }
    }
}

module.exports = Database;