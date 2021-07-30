import type { Command, CommandOptions } from '#util/commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { Parser } from 'expr-eval';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['calculate', 'calculator'],
        description: 'Evaluates a mathematical expression.',
        usage: '<expression>',
        example: [
            '1 + 2',
            '12 / (2.3 + 0.7)'
        ],
        args: [
            {
                name: 'expression',
                type: (_, arg) => {
                    if (!arg) return null;
                    return arg
                        .replaceAll(/(x|times)/gi, '*')
                        .replaceAll(/(÷|divided(\sby)?|:)/gi, '/')
                        .replaceAll(/plus/gi, '+')
                        .replaceAll(/minus/gi, '-')
                        .replaceAll(/to the power of/gi, '^')
                        .replaceAll('π', 'pi');
                },
                match: 'content',
                prompt: 'What expression would you like to evaluate?'
            }
        ]
    };

    public interactionOptions: ApplicationCommandOptionData[] = [
        {
            name: 'expression',
            description: 'The expression to evaluate.',
            type: 'STRING',
            required: true
        }
    ];

    public exec(message: Message, { expression }: { expression: string }) {
        return message.send(this.run(expression));
    }

    public async interact(interaction: CommandInteraction, { expression }: { expression: string }) {
        await interaction.defer();
        return interaction.editReply(this.run(expression));
    }

    private run(expression: string) {
        try {
            const answer = Parser.evaluate(expression).toString();
            return answer.length > 1015
                ? { content: `Output was uploaded as a file.`, files: [{ attachment: Buffer.from(answer), name: 'result.txt' }] }
                : `\`\`\`${answer}\`\`\``;
        } catch {
            return { content: `\`${expression}\` is not a valid expression.`, ephemeral: true };
        }
    }
}