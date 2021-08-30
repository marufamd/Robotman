import { Embed } from '#util/builders';
import { Commands } from '#util/commands';
import type { Command, CommandOptions } from '#util/commands';
import { ALIAS_REPLACEMENT_REGEX } from '#util/constants';
import { isOwner, toTitleCase } from '#util/misc';
import type { Message } from 'discord.js';
import { Permissions } from 'discord.js';
import { inject, injectable } from 'tsyringe';
import { reply } from '@skyra/editable-commands';

@injectable()
export default class implements Command {
	public constructor(@inject('commands') private readonly commands: Commands) {}

	public options: CommandOptions = {
		description: 'Displays info for commands.',
		usage: '<command>',
		example: ['aki', 'google'],
		args: [
			{
				name: 'command',
				type: (_, arg) => {
					if (!arg) return null;
					return (
						this.commands.find(
							(c) =>
								c.options.aliases.includes(arg.toLowerCase()) ||
								c.options.aliases.map((a) => a.replace(ALIAS_REPLACEMENT_REGEX, '')).includes(arg.toLowerCase())
						) ?? null
					);
				}
			}
		],
		disableHelp: true
	};

	public async exec(message: Message, { command }: { command: Command }) {
		const embed = new Embed();

		if (command) {
			if (command.options.sub) return;
			if (command.options.owner && !isOwner(message.author)) return;
			if (command.options.mod && !message.member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) return;

			const description = [command.options.description];

			if (command.options.extended?.length) {
				description.push('', this.format(command.options.extended));
			}

			embed
				.setTitle(`${process.env.BOT_PREFIX}${command.options.name} ${command.options.usage ?? ''}`)
				.setDescription(description.join('\n'))
				.setFooter(
					`Category: ${toTitleCase(command.options.group)}${
						command.options.cooldown > 0 ? ` | This command has a ${command.options.cooldown} second cooldown.` : ''
					}`
				);

			if (command.options.example?.length) {
				embed.addField('Examples', this.format(command.options.example));
			}

			if (command.options.aliases.length > 1) {
				embed.addField('Aliases', command.options.aliases.filter((a) => a !== command.options.name).join(', '));
			}
		} else {
			embed
				.setTitle('Commands')
				.setDescription(`Do \`${process.env.BOT_PREFIX}${this.options.name} ${this.options.usage}\` for more info on a command.`)
				.setFooter('Hover over a command for descriptions.');

			const groups: Record<string, string[]> = {};

			for (const [, cmd] of [...this.commands]) {
				if (['Owner', 'Moderator'].includes(cmd.options.group) || cmd.options.sub) continue;

				if (!(cmd.options.group in groups)) {
					groups[cmd.options.group] = [];
				}

				groups[cmd.options.group].push(`[\`${cmd.options.name}\`](https://notarealwebsi.te/ '${cmd.options.description}')`);
			}

			for (const [group, commands] of Object.entries(groups)) {
				embed.addField(group, commands.join(' '), true);
			}

			embed.inlineFields();
		}

		return reply(message, { embeds: [embed] });
	}

	private format(item: string | string[]) {
		return Array.isArray(item) ? item.join('\n') : item;
	}
}
