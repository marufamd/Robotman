const { Inhibitor } = require('discord-akairo');
const { Permissions } = require('discord.js');

module.exports = class extends Inhibitor {
    constructor() {
        super('mod', {
            reason: 'Moderator'
        });
    }

    exec(message) {
        if (!message.util?.parsed?.command?.description?.mod) return false;

        const modRoles = this.client.settings.get(message.guild.id, 'modRoles', []);
        const adminRoles = this.client.settings.get(message.guild.id, 'adminRoles', []);
        const hasRole = r => message.member?.roles.cache.has(r);

        return !this.client.isOwner(message.author) 
            && !message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD) 
            && !modRoles.some(hasRole)
            && !adminRoles.some(hasRole);
    }
};