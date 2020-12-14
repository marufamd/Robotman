module.exports = class Listener {
    constructor(client, event) {
        Object.defineProperties(this, {
            client: { value: client }, 
            handler: { value: client.handler },
            parser: { value: client.parser }
        });

        this.handles = event;
    }
};