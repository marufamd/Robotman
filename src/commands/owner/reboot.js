const { Command } = require('discord-akairo');
const { writeFile } = require('fs/promises');
const { join } = require('path');

module.exports = class extends Command {
    constructor() {
        super('reboot', {
            aliases: ['reboot'],
            description: 'Reboots the bot.',
            ownerOnly: true
        });
    }

    async exec(message) {
        this.client.log('Rebooting...', 'info');
        const msg = await message.util.send('Rebooting...');
        
        await writeFile(join(__dirname, '..', '..', 'reboot.json'), JSON.stringify({ channel: msg.channel.id, message: msg.id }));
        process.exit();
    }
};