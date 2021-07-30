import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, ConnectFour, Emojis } from '#util/constants';
import { ConnectFourGame } from '#util/games';
import { choosePlayer, getUser, pluralize } from '#util/misc';
import { Connect4AI } from 'connect4-ai';
import type { CommandInteraction, Message, MessageComponentInteraction } from 'discord.js';
import { MessageActionRow, MessageButton } from 'discord.js';

const { WAIT_TIME, INDICATORS } = ConnectFour;

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['connect', 'c4'],
        description: 'Starts a Connect Four game.',
        extended: 'You can choose to play against another user or the bot.',
        disableEdits: true
    };

    public async exec(message: Message) {
        return this.run(message);
    }

    public async interact(interaction: CommandInteraction) {
        return this.run(interaction);
    }

    private async run(data: Message | CommandInteraction) {
        const playerData = await choosePlayer(data);

        if (!playerData) return;

        const game = new ConnectFourGame()
            .addPlayers(getUser(data), playerData.player)
            .makeBoard();

        const engine = new Connect4AI();

        const rand = Math.floor(Math.random() * 2) + 1;

        const turns = {
            red: {
                player: rand === 1 ? game.players[0] : game.players[1],
                emoji: INDICATORS.RED
            },
            yellow: {
                player: rand === 1 ? game.players[1] : game.players[0],
                emoji: INDICATORS.YELLOW
            }
        };

        const title = `**${game.players[0].tag}** vs. **${game.players[1].tag}**`;

        let response = playerData.interaction;

        let turn = true;
        let skipMove = false;

        while (!game.win && !game.boardFull) {
            const piece = turn ? 'red' : 'yellow';
            const { player, emoji } = turns[piece];

            const otherPlayer = game.players.find(p => p.id !== player.id);

            turn = !turn;

            if (player.bot) {
                game.addPiece(engine.playAI('hard') + 1, piece);
                continue;
            }

            const embed = new Embed()
                .setColor(Colors.CONNECT_FOUR)
                .setTitle(`\\${emoji} ${player.username}, it's your turn!`)
                .setDescription(game.currentBoard)
                .addField('Time', Emojis.TIMER, true)
                .setFooter(`You have ${pluralize('minute', WAIT_TIME)} to make a move, or your move will be made for you.`);

            await response.editReply({
                content: skipMove ? `${title}\n\n${otherPlayer} has failed to make a move, so I have played for them.` : title,
                embeds: [embed],
                components: this.generateButtons()
            });

            const filter = (i: MessageComponentInteraction) => i.user.id === player.id && (game.addPiece(Number(i.customId), piece) || i.customId === 'stop');

            const move = await playerData.message
                .awaitMessageComponent({ filter, time: WAIT_TIME * 60000 })
                .catch(() => null);

            if (!move) {
                skipMove = true;
                await game.addPiece(engine.playAI('hard') + 1, piece);
                continue;
            }

            await move.deferUpdate();

            if (move.customId === 'stop') {
                embed.fields = [];
                embed.setTitle(`${player.username} has forfeitted. ${otherPlayer.username} wins!`);

                return move.editReply({
                    content: title,
                    embeds: [embed],
                    components: this.generateButtons(true)
                });
            }

            response = move;

            engine.play(Number(move.customId) - 1);

            if (skipMove) {
                skipMove = false;
            }
        }

        const embed = new Embed()
            .setColor(Colors.CONNECT_FOUR)
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
                let button;

                if (count === 7) {
                    button = new MessageButton()
                        .setCustomId('stop')
                        .setLabel('Forfeit')
                        .setStyle('DANGER')
                        .setDisabled(disabled);
                } else {
                    const id = (++count).toString();
                    button = new MessageButton()
                        .setCustomId(id)
                        .setLabel(id)
                        .setStyle('PRIMARY')
                        .setDisabled(disabled);
                }

                row.push(button);
            }

            rows.push(new MessageActionRow().addComponents(...row));
        }

        return rows;
    }
}