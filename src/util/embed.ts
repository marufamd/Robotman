import { MessageEmbed, MessageEmbedOptions } from 'discord.js';
import { colors } from './constants';

export default class RobotmanEmbed extends MessageEmbed {
    public constructor(data?: MessageEmbed | MessageEmbedOptions) {
        if (typeof data !== 'object' || data === null) data = {};
        if (typeof data.color === 'undefined') data.color = colors.ROBOTMAN;

        super(data);
    }

    public inlineFields(): this {
        if ([5, 8, 11, 14, 17, 20, 23, 26].includes(this.fields.length)) this.addField('\u200b', '\u200b', true);
        return this;
    }
}