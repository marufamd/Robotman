module.exports = class ConfigManager {
    constructor(client, table) {
        this.client = client;
        this.table = table;
    }

    async set(key, val) {
        const data = await this.get();
        data[key] = val;
        return this.table.upsert({ id: 1, data });
    }

    async get(key) {
        let data = await this.table.findOne({ where: { id: 1 } });
        if (!data) data = await this.table.create({ data: {} });
        data = data.data;
        if (key) return data[key];
        return data;
    }

    async stat(key) {
        const data = await this.get();
        if (data[key]) {
            data[key]++;
            return this.set(key, data[key]);
        }
        return null;
    }
};