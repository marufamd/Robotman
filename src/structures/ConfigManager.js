const { baseConfig } = require('../util/constants');

module.exports = class ConfigManager {
    constructor(table) {
        this.table = table;
    }

    async set(key, val) {
        const data = await this.get();
        data[key] = val;
        return this.table.upsert({ id: 1, data });
    }

    async get(key) {
        let item = await this.table.findOne({ where: { id: 1 } });
        if (!item) item = await this.table.create({ data: baseConfig });
        const { data } = item;
        if (key) return data[key];
        return data;
    }

    async stat(key) {
        const data = await this.get();
        if ((key in data) && !isNaN(data[key])) return this.set(key, ++data[key]);
        return null;
    }
};