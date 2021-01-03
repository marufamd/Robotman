const { Command } = require('discord-akairo');
const Docs = require('discord.js-docs');
const { capitalize } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('docs', {
            aliases: ['docs', 'djs', 'akairo'],
            description: {
                info: 'Shows documentation for the provided branch.',
                usage: '<query> [branch] --force'
            },
            ownerOnly: true,
            args: [
                {
                    id: 'query',
                    type: 'string',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                },
                {
                    id: 'branch',
                    type: ['stable', 'master', 'commando', 'rpc', 'akairo', 'collection'],
                    default: 'stable'
                },
                {
                    id: 'force',
                    type: 'flag',
                    flag: ['--force', '-force', '-f']
                }
            ],
        });
    }

    async exec(message, { query, branch, force }) {
        if (branch === 'akairo') branch = 'akairo-master';

        const docs = await Docs.fetch(branch, { force });

        const embed = this.client.util.embed()
            .setColor(docs.color)
            .setFooter(
                `${capitalize(docs.repo.replace('-akairo', ' Akairo')).replace('Rpc', 'Discord RPC')} ${capitalize(docs.branch)} Documentation`,
                docs.icon.includes('akairo') ? 'https://discord-akairo.github.io/static/favicon.ico' : docs.icon
            );

        const element = docs.get(...query.split(/\.|#/));

        if (element) {
            let title = element.formattedName;
            if (element.access === 'private') title += ' [Private]';
            if (element.deprecated) title += ' [Deprecated]';

            if (element.extends) embed.addField('Extends', element.formatInherits(element.extends), true);
            if (element.implements) embed.addField('Implements', element.formatInherits(element.implements), true);

            embed
                .setTitle(title)
                .setURL(element.url)
                .setDescription(element.formattedDescription);

            element.formatEmbed(embed);
            embed.addField('Source', `[Click Here](${element.sourceURL})`);
        } else {
            const results = docs.search(query);
            if (!results) return message.util.send(`Could not find that item in the documentation for \`${branch}\`.`);

            embed
                .setTitle('Search Results')
                .setDescription(results.map(e => `${e.embedPrefix ? `${e.embedPrefix} ` : ''}**${e.link}**`));
        }

        return message.util.send(embed);
    }
};