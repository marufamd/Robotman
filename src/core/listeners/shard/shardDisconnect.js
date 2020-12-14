const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "shardDisconnect");
    }

    handle(disconnection) {
        this.client.log(`Disconnection: Code ${disconnection.code} ${disconnection.reason}`, "warn");
    }
};