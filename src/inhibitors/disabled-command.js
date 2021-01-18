const { Inhibitor } = require('discord-akairo');

module.exports = class extends Inhibitor {
    constructor() {
        super('disabled-command', {
            reason: 'Disabled Command'
        });
    }

    exec(message) {
        if (!message.util?.parsed?.command) return false;
        const disabled = this.client.settings.get(message.guild.id, 'disabledCommands', []);
        return disabled.includes(message.util.parsed.command.id);
    }
};