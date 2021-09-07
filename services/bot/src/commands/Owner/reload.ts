import type { Command, CommandOptions } from '#util/commands';
import { assignOptions, Commands } from '#util/commands';
import { ALIAS_REPLACEMENT_REGEX } from '#util/constants';
import { reply } from '@skyra/editable-commands';
import type { Message } from 'discord.js';
import { container, inject, injectable } from 'tsyringe';

@injectable()
export default class implements Command {
	public constructor(@inject('commands') private readonly commands: Commands) {}

	public options: CommandOptions = {
		description: 'Reloads a command.',
		extended: 'You can use the --all flag to reload all commands.',
		usage: '[command>] [--all]',
		example: 'ping',
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
			},
			{
				name: 'all',
				match: 'flag',
				flags: ['all', 'a']
			}
		]
	};

	public async exec(message: Message, { command, all }: { command: Command; all: boolean }) {
		if (all) {
			for (const [, cmd] of [...this.commands]) {
				await this.reload(cmd);
			}

			return reply(message, `Reloaded ${this.commands.size} commands.`);
		}

		if (command) {
			await this.reload(command);

			return reply(message, `Reloaded the command \`${command.options.name}\`.`);
		}

		return reply(message, 'Please provide a command to reload, or use the `--all` flag.');
	}

	private async reload(command: Command) {
		this.commands.delete(command.options.name);

		delete require.cache[require.resolve(command.path)];

		const newCommand = container.resolve<Command>((await import(command.path)).default);

		assignOptions(newCommand, command.path);

		this.commands.set(newCommand.options.name, newCommand);
	}
}
