import type { Command, CommandOptions } from '#util/commands';
import { DateFormats } from '#util/constants';
import { toTitleCase } from '#util/misc';
import { reply } from '@skyra/editable-commands';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['time-zone', 'convert-time'],
		description: 'Displays the current time in a specified timezone.',
		usage: '<time zone>',
		example: ['utc', 'los angeles', 'America/New York', 'gmt'],
		args: [
			{
				name: 'zone',
				type: 'timezone',
				match: 'content',
				prompt: 'What timezone would you like to view the current time in?'
			}
		]
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'zone',
			description: 'The timezone to display the current time in.',
			type: 'STRING',
			required: true
		}
	];

	public exec(message: Message, { zone }: { zone: string }) {
		return reply(message, this.run(zone));
	}

	public interact(interaction: CommandInteraction, { zone }: { zone: string }) {
		return interaction.reply(this.run(zone));
	}

	private run(zone: string) {
		const formatted = dayjs().tz(zone).format(DateFormats.CLOCK);

		let formatText = zone.length <= 3 ? zone.toUpperCase() : toTitleCase(zone.replaceAll(/(_|\/)/gi, ' '));
		formatText = zone.includes('/') ? formatText.replace(' ', '/') : formatText;

		return `🕐 The current time for **${formatText.replaceAll('_', ' ')}** is **${formatted}**`;
	}
}
