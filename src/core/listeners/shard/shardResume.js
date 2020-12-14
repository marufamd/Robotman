const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "shardResume");
    }

    handle() {
        this.client.log("Reconnected", "log");
    }
};