const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "message");
    }

    handle(message) {
        this.handler.handleCommand(message);
    }
};