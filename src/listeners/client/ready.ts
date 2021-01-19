import { Listener } from 'discord-akairo';
import { TextChannel } from 'discord.js';
import { existsSync, promises as fs } from 'fs';
import { join } from 'path';

export default class extends Listener {
    public constructor() {
        super('ready', {
            event: 'ready',
            emitter: 'client',
            type: 'once'
        });
    }

    public async exec() {
        const rebootPath = join(__dirname, '..', '..', 'reboot.json');

        if (existsSync(rebootPath)) {
            const reboot = JSON.parse(await fs.readFile(rebootPath, 'utf8'));

            const m = await (this.client.channels.cache.get(reboot.channel) as TextChannel).messages.fetch(reboot.message);
            const msg = await m.edit('Rebooted!');
            await msg.edit(`Rebooted! Took ${msg.editedTimestamp - msg.createdTimestamp}ms`);

            await fs.unlink(rebootPath);
        }

        this.client.log(`Logged in as ${this.client.user.tag} (${this.client.user.id})!`);
        if (!this.client.development) void this.client.user.setPresence({ activity: { name: `${process.env.BOT_PREFIX}help` } });
    }
}