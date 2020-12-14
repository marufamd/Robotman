class TagsManager {
    constructor(handler, db) {
        Object.defineProperty(this, "handler", { value: handler });

        this.db = db;
        this.db.sync();
    }

    async get(name, guild) {
        const tag = await this.db.findOne({ where: { guild, name } });
        if (!tag) return null;
        return tag;
    }

    async add({ name, contents, attachments, guild, user }) {
        const tag = await this.db.create({ guild, name, contents, attachments, username: user.tag, userid: user.id });

        return tag.name;
    }

    async edit({ name, contents, attachments, guild, user }) {
        const updated = await this.db.update({ contents, attachments, edited_username: user.tag, edited_userid: user.id }, { where: { guild, name } });
        if (updated > 0) return name;

        return null;
    }

    async delete(name, guild) {
        const deleted = await this.db.destroy({ where: { guild, name } });
        if (!deleted) return null;

        return name;
    }

    async list(guild) {
        const list = await this.db.findAll({ where: { guild }, attributes: ["name"] });
        if (!list || !list.length) return null;

        const str = list.map(t => t.name);
        return str;
    }
}

module.exports = TagsManager;