const { Command } = require('discord-akairo');
const { evaluate } = require('mathjs');
const { trim, paste } = require('../../util');

module.exports = class extends Command {
    constructor() {
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
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What expression would you like to evaluate?'
                    }
                }
            ],
        });
    }

    async exec(message, { expression }) {
        expression = expression
            .replaceAll(/(x|times)/gi, '*')
            .replaceAll(/(÷|divided(\sby)?|:)/gi, '/')
            .replaceAll(/plus/gi, '+')
            .replaceAll(/minus/gi, '-')
            .replaceAll(/to the power of/gi, '^')
            .replaceAll('π', 'pi');

        let response;

        try {
            const answer = evaluate(expression);
            response = this.client.util.embed()
                .addField('Input', `\`\`\`${trim(expression, 1015)}\`\`\``)
                .addField('Result', answer.length > 1015 ? await paste(answer, '') : `\`\`\`${answer}\`\`\``);
        } catch {
            response = `\`${expression}\` is not a valid expression.`;
        } finally {
            message.util.send(response);
        }
    }
};