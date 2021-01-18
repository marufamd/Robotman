import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import { Message } from 'discord.js';
import { Parser } from 'expr-eval';
import Interaction from '../../structures/Interaction';
import { paste } from '../../util';

export default class extends Command {
    public constructor() {
        super('math', {
            aliases: ['math', 'calculate', 'calculator', 'solve', 'convert'],
            description: {
                info: 'Evaluates a mathematical expression',
                usage: '<expression>',
                examples: [
                    '1 + 2',
                    '12 / (2.3 + 0.7)',
                    'sin(45 deg) ^ 2',
                    '12.7 cm to inch',
                    '10 weeks to days'
                ]
            },
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

    public interactionOptions = {
        name: 'math',
        description: 'Evaluates a mathematical expression',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'expression',
                description: 'The expression to evaluate.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { expression }: { expression: string }) {
        return message.util.send(await this.main(expression));
    }

    public async interact(interaction: Interaction) {
        const expression = interaction.option('expression') as string;
        return interaction.respond(await this.main(expression));
    }

    public async main(expression: string) {
        let response;

        try {
            const answer = Parser.evaluate(expression).toString();
            response = answer.length > 1015 ? `Output was uploaded to hastebin. ${await paste(answer, '')}` : `\`\`\`${answer}\`\`\``;
        } catch {
            response = { content: `\`${expression}\` is not a valid expression.`, type: 'message', ephemeral: true };
        }

        return response;
    }
}