import { oneLine } from 'common-tags';
import { Command, PrefixSupplier } from 'discord-akairo';
import type { CollectorFilter, Message } from 'discord.js';
import ConnectFour from '../../structures/ConnectFour';
import { plural } from '../../util';
import { connectFour, colors, emojis } from '../../util/constants';

const { CANCEL_TIME, WAIT_TIME, indicators } = connectFour;

export default class extends Command {
    public constructor() {
        super('connect-four', {
            aliases: ['connect-four', 'connect', 'c4', 'c-four'],
            description: 'Starts a Connect Four game. Requires two players.',
            editable: false,
            lock: 'channel'
        });
    }

    public async exec(message: Message) {
        const prefix = (this.handler.prefix as PrefixSupplier)(message);

        await message.channel.send(oneLine`
        **${message.author.username}** has started a game! Type \`${prefix}connectjoin\` to face them. 
        To cancel the game, type \`${prefix}connectend\`. The game will be automatically cancelled if no one joins in the next ${CANCEL_TIME} minutes.
        `);

        const command = (resp: Message, cmd: string) => resp.content.toLowerCase() === `${prefix}connect${cmd}`;

        const filter = (resp: Message) =>
            (resp.author.id !== message.author.id && command(resp, 'join')) ||
            (resp.author.id === message.author.id && command(resp, 'end'));

        const join = await this.getResponse(message, filter, CANCEL_TIME * 60000);

        if (!join) return message.channel.send('A second player has not joined. The game has been cancelled.');

        if (join.author.id === message.author.id && command(join, 'end')) return message.channel.send('Cancelled the game.');

        const game = new ConnectFour()
            .addPlayer(message.author)
            .addPlayer(join.author);

        await message.channel.send(`**${join.author.username}** has joined the game!`);

        const turns = {
            red: {
                player: game.players[0],
                emoji: indicators.red
            },
            yellow: {
                player: game.players[1],
                emoji: indicators.yellow
            }
        };

        let turn = true,
            lastSkipped = false;

        game.makeBoard();

        while (!game.win && !game.boardFull) {
            const piece = turn ? 'red' : 'yellow';
            const { player, emoji } = turns[piece];

            turn = !turn;

            const embed = this.client.util
                .embed()
                .setColor(colors.CONNECT_FOUR)
                .setTitle(`\\${emoji} ${player.username}, it's your turn!`)
                .setDescription(`Type a number from 1-7 to place a piece, or \`${prefix}connectstop\` to forfeit.\n\n${game.currentBoard}`)
                .addField('Time', emojis.timer, true)
                .setFooter(`You have ${WAIT_TIME} ${plural('minute', WAIT_TIME)} to make a move.`);

            const msg = await message.channel.send(embed);

            const turnFilter = (resp: Message) => {
                const num = parseInt(resp.content);
                return resp.author.id === player.id &&
                    ((this.inRange(num) && game.addPiece(num, piece)) || command(resp, 'stop'));
            };

            const move = await this.getResponse(message, turnFilter, WAIT_TIME * 60000);

            if (!move) {
                if (lastSkipped) return message.channel.send('Both players have failed to make a move. Game has been cancelled.');

                await msg.delete();
                await message.channel.send(`${player}, you have failed to make a move. Your turn has been skipped.`);

                lastSkipped = true;
                continue;
            }

            if (command(move, 'stop')) {
                const winner = game.players.filter(p => p.id !== player.id)[0];
                return message.channel.send(`${player} has forfeited the match, ${winner} wins!`);
            }

            if (lastSkipped) lastSkipped = false;

            await msg.delete();
        }

        const embed = this.client.util
            .embed()
            .setColor(colors.CONNECT_FOUR)
            .setDescription(game.currentBoard)
            .setFooter(`To start another game, type ${prefix}${message.util.parsed.alias}`);

        if (game.win) {
            const winner = turns[turn ? 'yellow' : 'red'];
            embed.setTitle(`\\${winner.emoji} ${winner.player.username} has won the game!`);
        } else if (game.boardFull) {
            embed.setTitle('The board is filled. The game was a draw!');
        }

        return message.channel.send(embed);
    }

    private async getResponse(message: Message, filter: CollectorFilter, time: number): Promise<Message | null> {
        const collected = await message.channel
            .awaitMessages(filter, { max: 1, time, errors: ['time'] })
            .catch(() => null);

        if (!collected) return null;

        return collected.first();
    }

    private inRange(x: number) {
        return x >= 1 && x <= 7;
    }
}