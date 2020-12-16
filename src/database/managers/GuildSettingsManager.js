class GuildSettingsManager {
    constructor(client, db) {
        Object.defineProperty(this, "client", { value: client });

        this.db = db;
        this.db.sync();
    }

    async get(guild, prop) {
        const found = await this.db.findOne({ where: { guild } });
        if (!found) return null;

        if (prop) return found[prop];
        return found;
    }

    async set(guild, props) {
        props.guild = guild;
        await this.db.create(props);

        return props;
    }

    async edit(guild, props) {
        const edited = await this.db.update(props, { where: { guild } });
        if (edited > 0) return props;

        return null;
    }
}

module.exports = GuildSettingsManager;