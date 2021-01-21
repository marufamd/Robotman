import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { Guild, Message, Util } from 'discord.js';
import { difference, formatDate, title } from '../../util';
import RobotmanEmbed from '../../util/embed';

export default class extends Command {
    public constructor() {
        super('serverinfo', {
            aliases: ['server-info', 'guild-info', 'server', 'guild', 's-info'],
            description: 'Displays info about the server.',
            args: [
                {
                    id: 'mode',
                    type: ['info', 'icon'],
                    default: 'info'
                }
            ]
        });
    }

    public exec(message: Message, { mode }: { mode: 'info' | 'icon' }) {
        const guild = message.guild;

        let embed = this.client.util.embed();

        embed = this[mode](message.guild, embed);
        if (guild.owner.displayColor) embed.setColor(guild.owner.displayColor);

        return message.util.send(embed);
    }

    private icon(guild: Guild, embed: RobotmanEmbed) {
        const icon = guild.iconURL({ format: 'png', size: 2048, dynamic: true });

        embed
            .setTitle(`${guild.name}'s Icon`)
            .setURL(icon)
            .setImage(icon)
            .setFooter(`ID: ${guild.id}`);

        return embed;
    }

    private info(guild: Guild, embed: RobotmanEmbed) {
        const icon = guild.iconURL({ format: 'png', size: 2048, dynamic: true });
        const splash = guild.splashURL({ format: 'png', size: 2048 });

        const channels = guild.channels.cache;
        const voice = channels.filter(c => c.type === 'voice');
        const text = channels.filter(c => c.type === 'text');
        const categories = channels.filter(c => c.type === 'category');

        const filterLevel = {
            DISABLED: 'None',
            MEMBERS_WITHOUT_ROLES: 'Scan media content from members without a role',
            ALL_MEMBERS: 'Scan media content from all members'
        };

        let str = stripIndents`
            • **Created On:** ${formatDate(guild.createdAt)} (${difference(guild.createdAt, 'd')} days ago)
            • **Owner:** ${Util.escapeMarkdown(guild.owner.user.tag)}
            • **Region:** ${this.formatRegion(guild.region)}
            • **Members:** ${guild.memberCount}
            • **Channels:** ${channels.size} (${categories.size} Categories, ${text.size} Text, ${voice.size} Voice)
            • **Roles** ${guild.roles.cache.size}
            • **Emojis:** ${guild.emojis.cache.size}
            • **Boosts:** ${guild.premiumSubscriptionCount ?? 'None'}${guild.premiumTier ? ` (Level ${guild.premiumTier})` : ''}
            • **Verification Level:** ${title(guild.verificationLevel.replaceAll('_', ' '))}
            • **Explicit Content Filter:** ${filterLevel[guild.explicitContentFilter]}`;

        if (splash) str += `\n• **Splash URL:** [Click Here](${splash})`;

        embed
            .setTitle(guild.name)
            .setURL(icon)
            .setThumbnail(icon)
            .setDescription(str)
            .setFooter(`ID: ${guild.id}${guild.partnered ? ' | This server is Partnered' : ''}`, guild.partnered ? 'https://www.discordia.me/uploads/badges/new_partner_badge.png' : null);

        return embed;
    }

    private formatRegion(region: string) {
        return title(region.replace(/-/g, ' ')
            .replace('southafrica', 'south africa')
            .replace('hongkong', 'hong kong'))
            .replace(/(Eu|Us) /g, a => a.toUpperCase());
    }
}