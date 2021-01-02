const Interaction = require('./Interaction');
const { CommandOptionTypes } = require('../util/constants');

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
        if (typeof data === 'string') data = this.client.commandHandler.findCommand(data)?.interactionOptions;
        if (!data) return;
        if (data.options) data.options = this.resolveOptions(data.options);

        let path = this.client.api.applications(this.client.user.id);
        if (guild) path = path.guilds(guild);

        return path.commands.post({ data });
    }

    edit(command, data, guild) {
        if (typeof data === 'string') data = this.client.commandHandler.findCommand(data)?.interactionOptions;
        if (!data) return;

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
        if (this.client.commandHandler.runCooldowns(interaction, command)) return;

        try {
            if (command.typing) interaction.channel?.startTyping();
            await command.interact(interaction);
        } catch (e) {
            this.client.commandHandler.emit('error', e, interaction, command);
        } finally {
            if (command.typing) interaction.channel?.stopTyping();
        }
    }

    resolveOptions(options) {
        return options.map(function resolveOption(o) {
            if (typeof o.type === 'string') o.type = CommandOptionTypes[o.type] ?? CommandOptionTypes['string'];
            if (o.options) o.options = o.options.map(resolveOption);
            return o;
        });
    }
};