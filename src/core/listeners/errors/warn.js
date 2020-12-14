const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "warn");
    }

    handle(warn) {
        this.client.log(warn, "warn");
    }
};