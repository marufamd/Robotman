const Command = require("../../../classes/Command");
const { writeFile } = require("fs/promises");
const { join } = require("path");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "reboot",
            description: "Reboots bot",
            group: "owner",
            aliases: ["rboot", "rbt"],
            disableEdits: true
        });
    }

    async run(message) {
        this.client.log("Rebooting...", "info");
        const msg = await message.respond("Rebooting...");
        
        await writeFile(join(__dirname, "..", "..", "..", "..", "reboot.json"), JSON.stringify({ channel: msg.channel.id, message: msg.id }));
        process.exit();
    }
};