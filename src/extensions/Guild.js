const { Structures } = require("discord.js");
const GuildSettings = require("../core/classes/GuildSettings");

module.exports = Structures.extend("Guild", Guild => {
    return class RobotGuild extends Guild {
        constructor(...args) {
            super (...args);

            this.settings = new GuildSettings(this);
        }

        get development() {
            return this.id === process.env.TEST_SERVER;
        }

        createTag({ name, contents, attachments, user }) {
            return this.client.handler.tags.add({ name, contents, attachments, guild: this.id, user });
        }

        editTag({ name, contents, attachments, user }) {
            return this.client.handler.tags.edit({ name, contents, attachments, guild: this.id, user });
        }

        deleteTag(name) {
            return this.client.handler.tags.delete(name, this.id);
        }

        listTags() {
            return this.client.handler.tags.list(this.id);
        }

        getTags() {
            return this.client.handler.tags.db.findAll({ where: { guild: this.id } });
        }
    };
});