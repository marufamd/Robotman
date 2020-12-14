const Listener = require("../../classes/Listener");
const { existsSync, promises: { readFile, unlink } } = require("fs");
const { join } = require("path");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "ready");
    }

    async handle() {
        this.client.owner = await this.client.users.fetch(process.env.OWNER);

        const rebootPath = join(__dirname, "..", "..", "..", "reboot.json");

        if (existsSync(rebootPath)) {
            const reboot = JSON.parse(await readFile(rebootPath, "utf8"));

            const m = await this.client.channels.cache.get(reboot.channel).messages.fetch(reboot.message);
            const msg = await m.edit("Rebooted!");
            await msg.edit(`Rebooted! Took ${msg.editedTimestamp - msg.createdTimestamp}ms`);

            await unlink(rebootPath);
        }

        this.client.log(`Logged in as ${this.client.user.tag} (${this.client.user.id})!`);
        if (!this.client.development) this.client.user.setPresence({ activity: { name: `${process.env.CLIENT_PREFIX}help` } });
    }
};