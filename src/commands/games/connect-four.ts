import { Command } from 'discord-akairo';
import { Message, MessageActionRow, MessageButton, MessageComponentInteraction } from 'discord.js';
import ConnectFour from '../../structures/ConnectFour';
import { choosePlayer, plural } from '../../util';
import { colors, connectFour, emojis } from '../../util/constants';
import { Connect4AI } from 'connect4-ai';

const { WAIT_TIME, indicators } = connectFour;

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
        const data = await choosePlayer(message);
        if (!data) return;

        const msg = data.message;

        const game = new ConnectFour()
            .addPlayer(message.author)
            .addPlayer(data.player);

        const engine = new Connect4AI();

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

        const title = `**${game.players[0].tag}** vs. **${game.players[1].tag}**`;

        let response = data.interaction;

        let turn = true;
        let skipMove = false;

        game.makeBoard();

        while (!game.win && !game.boardFull) {
            const piece = turn ? 'red' : 'yellow';
            const { player, emoji } = turns[piece];

            const otherPlayer = game.players.find(p => p.id !== player.id);

            turn = !turn;

            if (player.bot) {
                game.addPiece(engine.playAI('hard') + 1, piece);
                continue;
            }

            const embed = this.client.util
                .embed()
                .setColor(colors.CONNECT_FOUR)
                .setTitle(`\\${emoji} ${player.username}, it's your turn!`)
                .setDescription(game.currentBoard)
                .addField('Time', emojis.timer, true)
                .setFooter(`You have ${WAIT_TIME} ${plural('minute', WAIT_TIME)} to make a move, or your move will be made for you.`);

            await response.editReply({
                content: skipMove ? `${title}\n\n${otherPlayer} has failed to make a move, so I have played for them.` : title,
                embeds: [embed],
                components: this.generateButtons()
            });

            const filter = (i: MessageComponentInteraction) => i.user.id === player.id && (game.addPiece(Number(i.customID), piece) || i.customID === 'stop');

            const move = await msg.awaitMessageComponentInteraction(filter, WAIT_TIME * 60000).catch(() => null);

            if (!move) {
                skipMove = true;
                await game.addPiece(engine.playAI('hard') + 1, piece);
                continue;
            }

            await move.deferUpdate();

            if (move.customID === 'stop') {
                embed.fields = [];
                embed.setTitle(`${player.username} has forfeitted. ${otherPlayer.username} wins!`);

                return move.editReply({
                    content: title,
                    embeds: [embed],
                    components: this.generateButtons(true)
                });
            }

            response = move;

            engine.play(Number(move.customID) - 1);

            if (skipMove) skipMove = false;
        }

        const embed = this.client.util
            .embed()
            .setColor(colors.CONNECT_FOUR)
            .setDescription(game.currentBoard);

        if (game.win) {
            const winner = turns[turn ? 'yellow' : 'red'];
            embed.setTitle(`\\${winner.emoji} ${winner.player.username} has won the game!`);
        } else if (game.boardFull) {
            embed.setTitle('The board is filled. The game was a draw!');
        }

        return response.editReply({
            content: title,
            embeds: [embed],
            components: this.generateButtons(true)
        });
    }

    private generateButtons(disabled = false) {
        let count = 0;
        const rows = [];

        for (let i = 0; i < 2; i++) {
            const row = [];

            for (let j = 0; j < 4; j++) {
                let button: MessageButton;

                if (count === 7) {
                    button = new MessageButton()
                        .setCustomID('stop')
                        .setLabel('Forfeit')
                        .setStyle('DANGER')
                        .setDisabled(disabled);
                } else {
                    const id = (++count).toString();
                    button = new MessageButton()
                        .setCustomID(id)
                        .setLabel(id)
                        .setStyle('PRIMARY')
                        .setDisabled(disabled);
                }

                row.push(button);
            }

            rows.push(
                new MessageActionRow()
                    .addComponents(...row)
            );
        }

        return rows;
    }
}