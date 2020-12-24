const { oneLine } = require('common-tags');
const { Command } = require('discord-akairo');
const ConnectFour = require('../../structures/ConnectFour');

const { getPrefix } = require('../../util');
const { connectFour: { CANCEL_TIME, WAIT_TIME, indicators }, colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('connectfour', {
            aliases: ['connect-four', 'connect', 'c4', 'c-four'],
            description: 'Starts a Connect Four game.',
            editable: false
        });
    }

    async exec(message) {
        if (this.client.connectFour.has(message.channel.id)) return message.util.send('There is already a Connect Four game in progress in this channel.');

        const prefix = getPrefix(message);

        try {
            const game = new ConnectFour();
            game.players.push(message.author);
            
            this.client.connectFour.add(message.channel.id);
            this.client.config.stat('connect_four');

            message.channel.send(oneLine`**${message.author.username}** has started a game! Type \`${prefix}connectjoin\` to face them. 
        To cancel the game, type \`${prefix}connectend\`. The game will be automatically cancelled if no one joins in the next ${CANCEL_TIME} minutes.`);

            const command = (resp, cmd) => resp.content.toLowerCase() === `${message.util.parsed.prefix}connect${cmd}`;

            const filter = resp => (resp.author.id !== message.author.id && command(resp, 'join')) || (resp.author.id === message.author.id && command(resp, 'end'));
            let join = await message.channel.awaitMessages(filter, { max: 1, time: CANCEL_TIME * 60000, errors: ['time'] }).catch(() => null);

            if (!join) {
                if (this.client.games.connect4.has(message.channel.id)) {
                    message.channel.send('A second player has not joined. The game has been cancelled.');
                    this.client.connectFour.delete(message.channel.id);
                }
                return;
            }

            join = join.first();

            if (join.author.id === message.author.id && command(join, 'end')) {
                this.client.connectFour.delete(message.channel.id);
                return message.channel.send('Cancelled the game.');
            }

            const joined = join.author;
            game.players.push(joined);
            message.channel.send(`**${joined.username}** has joined the game!`);

            const turns = {
                red: { player: game.players[0], emoji: indicators.red },
                yellow: { player: game.players[1], emoji: indicators.yellow }
            };

            let turn = true,
                win = false,
                boardFull = false,
                lastSkipped = false;

            game.makeBoard();

            while (!win && !boardFull) {
                const piece = turn ? 'red' : 'yellow';
                const { player, emoji } = turns[piece];

                const embed = this.client.util.embed()
                    .setColor(colors.CONNECT_FOUR)
                    .setTitle(`\\${emoji} ${player.username}, it's your turn!`)
                    .setDescription(`Type a number from 1-7 to place a piece, or \`${prefix}connectstop\` to forfeit.\n\n${game.currentBoard}`)
                    .setFooter(`You have 1 minute to make a move.`);

                const msg = await message.channel.send(embed);

                const turnFilter = resp => resp.author.id === player.id && ((this.inRange(parseInt(resp.content)) && game.addPiece(parseInt(resp.content), piece)) || command(resp, 'stop'));

                let move = await message.channel.awaitMessages(turnFilter, { max: 1, time: WAIT_TIME * 60000, errors: ['time'] }).catch(() => null);

                if (!move) {
                    if (lastSkipped) {
                        this.client.connectFour.delete(message.channel.id);
                        return message.channel.send('Both players have failed to make a move. Game has been cancelled.');
                    }

                    msg.delete();
                    message.channel.send(`**${player},** you have failed to make a move. Your turn has been skipped.`);
                    
                    turn = !turn;
                    lastSkipped = true;
                    continue;
                }

                move = move.first();

                if (command(move, 'stop')) {
                    const winner = game.players.filter(p => p.id !== player.id)[0];
                    message.channel.send(`**${player}** has forfeited the match, **${winner}** wins!`);
                    this.client.connectFour.delete(message.channel.id);
                    return;
                }

                turn = !turn;
                lastSkipped = false;

                win = game.checkWin();
                boardFull = game.checkBoard();

                msg.delete();
            }

            const embed = this.client.util.embed()
                .setColor(colors.CONNECT_FOUR)
                .setDescription(game.currentBoard)
                .setFooter(`To start another game, type ${prefix}${message.util.parsed.alias}`);

            if (win) {
                let winner = turn ? 'yellow' : 'red';
                winner = turns[winner];
                embed.setTitle(`\\${winner.emoji} ${winner.player.username} has won the game!`);
            } else if (boardFull) {
                embed.setTitle('The board is filled. The game was a draw!');
            }

            message.channel.send(embed);
        } catch (e) {
            message.channel.send('An error occurred.');
            this.client.log(`Connect Four Error:\n${e.stack}`, 'error', { ping: true });
        } finally {
            this.client.connectFour.delete(message.channel.id);
        }
    }

    inRange(x) {
        return x >= 1 && x <= 7;
    }
};