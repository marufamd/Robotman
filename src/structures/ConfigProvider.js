const StatelessProvider = require('./StatelessProvider');
const { baseConfig } = require('../util/constants');

module.exports = class ConfigProvider extends StatelessProvider {
    constructor(table) {
        super(table);
    }

    async set(key, val) {
        const data = await this.get();
        data[key] = val;
        return this.table.upsert({ id: 1, data });
    }

    async get(key) {
        const { data } = (await this.table.findOne({ where: { id: 1 } })) ?? (await this.table.create({ data: baseConfig }));
        if (key) return data[key];
        return data;
    }

    async stat(key) {
        const data = await this.get();
        if ((key in data) && !isNaN(data[key])) return this.set(key, ++data[key]);
        return null;
    }
};