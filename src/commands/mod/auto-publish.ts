import { Command } from 'discord-akairo';
import type { Message, NewsChannel } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('autopublish', {
            aliases: ['auto-publish', 'publish'],
            description: {
                info: 'Adds or removes channels to the auto publishing list.',
                usage: '<-add | -remove> <channel>',
                examples: [
                    'add #news',
                    'remove #news'
                ]
            },
            args: [
                {
                    id: 'mode',
                    type: ['add', 'remove'],
                    default: 'add'
                },
                {
                    id: 'channel',
                    type: 'newsChannel',
                    prompt: {
                        start: 'What news channel would you like to add?',
                        retry: 'That is not a valid news channel. Please try again.'
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { mode, channel }: { mode: 'add' | 'remove'; channel: NewsChannel }) {
        console.log('a');
        let channels = this.client.settings.get(message.guild.id, 'crosspost_channels', []);
        if (typeof channels === 'string') channels = channels.split(',');

        let response;

        if (mode === 'add') {
            if (!channels.includes(channel.id)) {
                channels.push(channel.id);
                console.log(channels);
                await this.client.settings.set(message.guild.id, 'crosspost_channels', channels.join(','));
                response = `Enabled auto-publishing for ${channel}.`;
            } else {
                response = `Auto-publishing is already enabled in ${channel}.`;
            }
        } else if (mode === 'remove') {
            if (channels.includes(channel.id)) {
                channels.splice(channels.indexOf(channel.id), 1);
                console.log(channels);
                await this.client.settings.set(message.guild.id, 'crosspost_channels', channels.join(','));
                response = `Disabled auto-publishing for ${channel}.`;
            } else {
                response = `Auto-publishing is not enabled in ${channel}.`;
            }
        }

        return message.util.send(response);
    }
}