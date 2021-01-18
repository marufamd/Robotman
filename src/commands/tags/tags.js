const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('tags', {
            aliases: ['tags', 'tag-list', 'list-tags'],
            description: 'Lists all available tags'
        });
    }

    async exec(message) {
        let list = await this.client.tags.table.findAll({ where: { guild: message.guild.id }, attributes: ["name"] });
        if (!list?.length) return message.util.send('There are no tags set for this server.');
        list = list.map(t => t.get('name'));

        const embed = this.client.util.embed()
            .setTitle('Available Tags')
            .setDescription(list.join(', '))
            .setFooter(`Total: ${list.length}`);

        return message.util.send(embed);
    }
};