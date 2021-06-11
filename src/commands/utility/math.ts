import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { Parser } from 'expr-eval';
import { paste } from '../../util';

export default class extends Command {
    public constructor() {
        super('math', {
            aliases: ['math', 'calculate', 'calculator', 'solve', 'convert'],
            args: [
                {
                    id: 'expression',
                    type: (_, phrase) => {
                        if (!phrase) return null;
                        return phrase
                            .replaceAll(/(x|times)/gi, '*')
                            .replaceAll(/(÷|divided(\sby)?|:)/gi, '/')
                            .replaceAll(/plus/gi, '+')
                            .replaceAll(/minus/gi, '-')
                            .replaceAll(/to the power of/gi, '^')
                            .replaceAll('π', 'pi');
                    },
                    match: 'content',
                    prompt: {
                        start: 'What expression would you like to evaluate?'
                    }
                }
            ]
        });
    }

    public data = {
        usage: '<expression>',
        examples: [
            '1 + 2',
            '12 / (2.3 + 0.7)',
            'sin(45 deg) ^ 2',
            '12.7 cm to inch',
            '10 weeks to days'
        ]
    };

    public interactionOptions = {
        name: 'math',
        description: 'Evaluates a mathematical expression',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'expression',
                description: 'The expression to evaluate.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { expression }: { expression: string }) {
        return message.util.send(await this.run(expression));
    }

    public async interact(interaction: CommandInteraction, { expression }: { expression: string }) {
        return interaction.reply(await this.run(expression));
    }

    public async run(expression: string) {
        try {
            const answer = Parser.evaluate(expression).toString();
            return answer.length > 1015 ? `Output was uploaded to hastebin. ${await paste(answer, '')}` : `\`\`\`${answer}\`\`\``;
        } catch {
            return { content: `\`${expression}\` is not a valid expression.`, ephemeral: true };
        }
    }
}