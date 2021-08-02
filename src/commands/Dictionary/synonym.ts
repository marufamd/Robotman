import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, Links, NO_RESULTS_FOUND } from '#util/constants';
import { define } from '#util/wrappers';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
	public options: CommandOptions = {
		aliases: [],
		description: 'Finds synonyms for a word from the dictionary.',
		usage: '<word>',
		example: ['fast', 'cold'],
		args: [
			{
				name: 'word',
				match: 'content',
				prompt: 'What word would you like to search for?'
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'word',
			description: 'The word to search for.',
			type: 'STRING',
			required: true
		}
	];

	public async exec(message: Message, { word }: { word: string }) {
		return message.send(await this.run(word));
	}

	public async interact(interaction: CommandInteraction, { word }: { word: string }) {
		return interaction.reply(await this.run(word));
	}

	private async run(word: string) {
		const defined = await define(word, true);
		if (!defined?.synonyms?.length) return NO_RESULTS_FOUND;

		const embed = new Embed()
			.setAuthor('Merriam-Webster', 'https://pbs.twimg.com/profile_images/677210982616195072/DWj4oUuT.png', Links.MERIAM_WEBSTER)
			.setColor(Colors.DICTIONARY);

		if (Array.isArray(defined)) {
			embed
				.setTitle(`No synonyms found for \`${word}\``)
				.addField('Did you mean:', defined.map((a) => `[${a}](${Links.MERIAM_WEBSTER}/thesaurus/${encodeURIComponent(a)})`).join('\n'));
		} else {
			embed
				.setTitle(`Synonyms for ${defined.word}`)
				.setURL(`https://www.merriam-webster.com/thesaurus/${encodeURIComponent(defined.word)}`)
				.setDescription(defined.synonyms.map((s) => `[${s}](${Links.MERIAM_WEBSTER}/dictionary/${encodeURIComponent(s)})`).join('\n'));
		}

		return { embeds: [embed] };
	}
}
