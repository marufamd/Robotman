const Interaction = require('./Interaction');

module.exports = class InteractionHandler {
    constructor(client) {
        Object.defineProperty(this, 'client', { value: client });
    }

    fetchCommands(guild) {
        let path = this.client.api.applications(this.client.user.id);
        if (guild) path = path.guilds(guild);
        return path.commands.get();
    }

    create(data, guild) {
        let path = this.client.api.applications(this.client.user.id);
        if (guild) path = path.guilds(guild);
        return path.commands.post({ data });
    }

    edit(command, data, guild) {
        if (command && typeof command === 'object') command = command.id;
        let path = this.client.api.applications(this.client.user.id);
        if (guild) path = path.guilds(guild);
        return path.commands(command).patch({ data });
    }

    delete(command, guild) {
        if (command && typeof command === 'object') command = command.id;
        let path = this.client.api.applications(this.client.user.id);
        if (guild) path = path.guilds(guild);
        return path.commands(command).delete();
    }

    async handle(data) {
        const interaction = new Interaction(this.client, data);
        const command = this.client.commandHandler.findCommand(interaction.command.name);
        if (!command?.interact) return;

        try {
            await command.interact(interaction);
        } catch (e) {
            this.client.commandHandler.emit('error', e, interaction, command);
        }
    }
};