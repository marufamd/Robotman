const { Op } = require("sequelize");
const StatelessProvider = require('./StatelessProvider');

module.exports = class TagsProvider extends StatelessProvider {
    constructor(table) {
        super(table);
    }

    async set(name, guild, data) {
        name = name.toLowerCase();
        const tag = await this.get(name, guild);
        if (tag?.name === name) return this.table.update({ data }, { where: { guild, name } });

        return this.table.create({ name, guild, data });
    }

    get(name, guild) {
        name = name.toLowerCase();
        return this.table.findOne({
            where: {
                guild,
                [Op.or]: [
                    { name },
                    { aliases: { [Op.contains]: [name] } }
                ]
            }
        });
    }

    async delete(name, guild) {
        name = name.toLowerCase();
        return this.table.destroy({ where: { guild, name } });
    }

    async addAliases(name, guild, ...aliases) {
        name = name.toLowerCase();
        const tag = await this.get(name, guild);
        if (!tag) return null;

        const added = [];
        for (const alias of aliases) {
            if (tag.aliases.includes(alias) || await this.has(alias, guild)) continue;
            tag.aliases.push(alias);
            added.push(alias);
        }

        if (!added.length) return 'none';

        this.table.update({ aliases: tag.aliases }, { where: { name, guild } });
        return added;
    }

    async deleteAliases(name, guild, ...aliases) {
        name = name.toLowerCase();
        const tag = await this.get(name, guild);
        if (!tag) return null;

        const deleted = [];
        for (const alias of aliases) {
            if (tag.aliases.includes(alias)) {
                deleted.push(alias);
                tag.aliases.splice(tag.aliases.indexOf(alias), 1);
            }
        }

        if (!deleted.length) return 'none';

        this.table.update({ aliases: tag.aliases }, { where: { name, guild } });
        return deleted;
    }

    async has(name, guild) {
        return Boolean(await this.get(name, guild));
    }
};