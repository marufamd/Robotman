module.exports = class {
    constructor(client, db) {
        Object.defineProperty(this, "client", { value: client });
        this.db = db;
        this.db.sync();
    }

    async get(prop) {
        const [data] = await this.db.findOrCreate({ where: { id: 1 } });
        if (prop) return data.get(prop);
        return data;
    }

    async set(props) {
        const updated = await this.db.update(props, { where: { id: 1 } });
        if (updated > 0) return props;
        return null;
    }

    async stat(...stats) {
        const data = await this.db.findOne();
        for (const stat of stats) data.increment(stat);
    }
};