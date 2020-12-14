const Command = require("../../../classes/Command");
const ConnectFour = require("../../../games/ConnectFour");
const { Embed } = require("../../../../util");
const { connect: { color } } = require("../../../../util/constants");
const { oneLine } = require("common-tags");

const CANCEL_TIME = 15;

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "connectfour",
            description: "Starts a Connect 4 game",
            group: "fun",
            aliases: ["c4", "connect4", "connect-four", "connect-4", "connect"],
            disableEdits: true
        });
    }

    async run(message, args) {
        if (this.client.games.connect4.has(message.channel.id)) {
            const host = this.client.games.connect4.get(message.channel.id)[0];
            if (message.author.id === host.id && args[0] === "end") {
                this.client.games.connect4.delete(message.channel.id);
                return message.respond("Game has been cancelled.");
            } else {
                return message.progress("a Connect Four");
            }
        }

        try {
            const game = new ConnectFour();
            game.players.push(message.author);
            this.client.games.connect4.set(message.channel.id, game.players);
            this.client.util.stat("connectGames");

            message.respond(oneLine`**${message.author.username}** has started a game! Type \`${message.parsedPrefix}connectjoin\` to face them. 
        To cancel the game, type \`${message.parsedPrefix}${message.command} end\`. The game will be automatically cancelled if no one joins in the next ${CANCEL_TIME} minutes.`);

            const filter = resp => resp.author.id !== message.author.id && resp.content.toLowerCase() === `${message.prefix}connectjoin`;
            const join = await message.awaitMessage(filter, CANCEL_TIME * 60000);

            if (!join) {
                if (this.client.games.connect4.has(message.channel.id)) {
                    message.respond("No one joined. Game has been cancelled.");
                    this.client.games.connect4.delete(message.channel.id);
                }
                return;
            }

            const joined = join.author;
            game.players.push(joined);
            message.respond(`**${joined.username}** has joined the game!`);

            const turns = {
                red: { player: game.players[0], emoji: "🔴" },
                yellow: { player: game.players[1], emoji: "🟡" }
            };

            let turn = true;
            let win = false;
            let boardFull = false;
            let lastSkipped = false;

            game.makeBoard();

            while (!win && !boardFull) {
                const piece = turn ? "red" : "yellow";
                const { player, emoji } = turns[piece];
                
                const embed = new Embed(color)
                    .setTitle(`\\${emoji} ${player.username}, it's your turn!`)
                    .setDescription(`Type a number from 1-7 to place a piece, or \`${message.parsedPrefix}connectstop\` to forfeit.\n\n` + game.currentBoard)
                    .setFooter(`You have 1 minute to make a move.`);
                const msg = await message.embed(embed);

                const turnFilter = resp => {
                    return resp.author.id === player.id && 
                    ((this.inRange(parseInt(resp.content), 1, 7) && game.addPiece(parseInt(resp.content), turn ? "red" : "yellow")) || resp.content.toLowerCase() === `${message.prefix}connectstop`);
                };

                const move = await message.awaitMessage(turnFilter, 60000);
                if (!move) {
                    if (lastSkipped) {
                        this.client.games.connect4.delete(message.channel.id);
                        return message.respond("Both players have failed to make a move. Game has been stopped.");
                    }
                    msg.delete();
                    message.respond(`**${player.username},** you have failed to make a move. Your turn has been skipped.`);
                    turn = !turn;
                    lastSkipped = true;
                    continue;
                }

                if (move.content.toLowerCase() === `${message.prefix}connectstop`) {
                    const winner = game.players.filter(p => p.id !== player.id)[0];
                    message.respond(`**${player.username}** has forfeited the match, **${winner.username}** wins!`);
                    this.client.games.connect4.delete(message.channel.id);
                    return;
                }

                turn = !turn;
                lastSkipped = false;
                win = game.checkWin();
                boardFull = game.checkBoard();
                msg.delete();
            }

            const embed = new Embed(color)
                .setDescription(game.currentBoard)
                .setFooter(`To start another game, type ${message.parsedPrefix}${message.command}`);

            if (win) {
                let winner = turn ? "yellow" : "red";
                winner = turns[winner];
                embed.setTitle(`\\${winner.emoji} ${winner.player.username} has won the game!`);
            } else if (boardFull) {
                embed.setTitle("The board is filled. The game was a draw!");
            }

            message.embed(embed);
        } catch (e) {
            message.error(e);
            this.client.log(`Connect Four Error:\n${e.stack}`, "error");
        }

        this.client.games.connect4.delete(message.channel.id);
    }

    inRange(x, min, max) {
        return x >= min && x <= max;
    }
};