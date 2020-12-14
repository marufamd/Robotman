const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "shardReconnecting");
    }

    handle() {
        this.client.log("Attempting to reconnect...", "info");
    }
};