import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export default class extends Command {
    public constructor() {
        super('reboot', {
            aliases: ['reboot'],
            description: 'Reboots the bot.',
            ownerOnly: true
        });
    }

    public async exec(message: Message) {
        this.client.log('Rebooting...', 'info');
        const msg = await message.util.send('Rebooting...');

        await writeFile(join(__dirname, '..', '..', 'reboot.json'), JSON.stringify({ channel: msg.channel.id, message: msg.id }));
        process.exit();
    }
}