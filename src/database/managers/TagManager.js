const { Op } = require("sequelize");

class TagsManager {
    constructor(handler, db) {
        Object.defineProperty(this, "handler", { value: handler });

        this.db = db;
        this.db.sync();
    }

    async get(name, guild) {
        const tag = await this.db.findOne({
            where: {
                guild,
                [Op.or]: [
                    { name },
                    { aliases: { [Op.contains]: [name] } }
                ]
            }
        });
        if (!tag) return false;
        return tag;
    }

    async add({ name, contents, attachments = [], guild, user }) {
        const tag = await this.db.create({ guild, name, contents, attachments, createdBy: user.tag, userID: user.id });
        return tag.name;
    }

    async edit({ name, contents, attachments = [], guild, user }) {
        const updated = await this.db.update({ contents, attachments, editedBy: user.tag, editedUserID: user.id }, { where: { guild, name } });
        if (updated > 0) return name;
        return false;
    }

    async delete(name, guild) {
        const deleted = await this.db.destroy({ where: { guild, name } });
        if (!deleted) return false;
        return name;
    }

    async list(guild) {
        const list = await this.db.findAll({ where: { guild }, attributes: ["name"] });
        if (!list || !list.length) return false;

        const str = list.map(t => t.name);
        return str;
    }

    async alias(name, guild, aliases) {
        const updated = await this.db.update({ aliases }, { where: { guild, name } });
        if (updated > 0) return true;
        return false;
    }
}

module.exports = TagsManager;