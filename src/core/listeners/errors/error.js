const Listener = require("../../classes/Listener");

module.exports = class extends Listener {
    constructor(client) {
        super(client, "error");
    }

    handle(error) {
        this.client.log(error.stack, "error", { ping: true });
    }
};