const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "messageUpdate");
    }

    handle(original, message) {
        if (original.content === message.content ||
            ((Date.now() - message.createdTimestamp) / 60000) > 10) return;
        this.handler.handleCommand(message, true);
    }
};