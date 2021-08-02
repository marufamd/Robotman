import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { reply } from '@skyra/editable-commands';
import type { CommandInteraction, Message } from 'discord.js';
import { Client } from 'discord.js';
import { injectable } from 'tsyringe';

@injectable()
export default class implements Command {
	public constructor(private readonly client: Client) {}

	public options: CommandOptions = {
		aliases: ['latency'],
		description: "Checks the bot's connection to Discord."
	};

	public async exec(message: Message) {
		const msg = await reply(message, 'Getting Ping...');

		const embed = this.embed().addField(
			'Roundtrip',
			`⏱️ ${(msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp)}ms`,
			true
		);

		return msg.edit({ content: null, embeds: [embed] });
	}

	public async interact(interaction: CommandInteraction) {
		await interaction.reply('Getting Ping...');

		const reply = (await interaction.fetchReply()) as Message;

		const embed = this.embed().addField('Roundtrip', `⏱️ ${reply.createdTimestamp - interaction.createdTimestamp}ms`, true);

		return interaction.editReply({ content: null, embeds: [embed] });
	}

	private embed() {
		return new Embed().setTitle('🏓 Pong!').addField('Heartbeat', `<a:a_heartbeat:759165128448016492>  ${this.client.ws.ping}ms`, true);
	}
}
