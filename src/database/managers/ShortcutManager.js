class ShortcutManager {
    constructor(handler, db) {
        Object.defineProperty(this, "handler", { value: handler });

        this.db = db;
        this.db.sync();
    }

    async get(name) {
        const shortcut = await this.db.findOne({ where: { name } });
        if (!shortcut) return null;
        return shortcut;
    }

    async add(name, command, params, devOnly) {
        await this.db.create({
            name,
            command,
            params: params ? params.join(" ").replace(/^\s*```(js|javascript)?/, "").replace(/```\s*$/, "") : "",
            hidden: false,
            dev: devOnly
        });

        return `Added \`${name}\` shortcut!`;
    }

    async edit(name, props) {
        const updated = await this.db.update(props, { where: { name } });
        if (updated > 0) return name;

        return null;
    }

    async delete(name) {
        const deleted = await this.db.destroy({ where: { name } });
        if (!deleted) return null;

        return `Deleted \`${name}\` shortcut.`;
    }

    async list(devOnly = false) {
        const fetched = await this.db.findAll({ attributes: ["name", "hidden", "dev"] });
        const list = devOnly ? fetched : fetched.filter(l => !l.hidden && !l.dev);

        if (!list || !list.length) return null;

        return list;
    }
}

module.exports = ShortcutManager;