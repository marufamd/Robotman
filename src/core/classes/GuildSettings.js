module.exports = class GuildSettings {
    constructor(guild) {
        Object.defineProperties(this, {
            guild: { value: guild },
            client: { value: guild.client }
        });
    }

    get(prop) {
        return this.client.settings.get(this.guild.id, prop);
    }

    set(props) {
        return this.client.settings.get(this.guild.id, props);
    }

    edit(props) {
        return this.client.settings.edit(this.guild.id, props);
    }
};