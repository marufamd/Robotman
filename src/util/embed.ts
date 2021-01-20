import { MessageEmbed, MessageEmbedOptions } from 'discord.js';
import { colors } from './constants';

export default class RobotmanEmbed extends MessageEmbed {
    public constructor(data?: MessageEmbed | MessageEmbedOptions) {
        if (typeof data !== 'object' || data === null) data = {};
        if (typeof data.color === 'undefined') data.color = colors.ROBOTMAN;

        super(data);
    }

    public inlineFields() {
        const length = this.fields.length - 5;
        if (length % 3 === 0) this.addField('\u200b', '\u200b', true);
        return this;
    }
}