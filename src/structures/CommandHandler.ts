import { Command, CommandHandler, CommandHandlerOptions, Constants } from 'discord-akairo';
import { Interaction, Message } from 'discord.js';
import type RobotmanClient from './Client';

export default class RobotmanCommandHandler extends CommandHandler {
    public constructor(client: RobotmanClient, options: CommandHandlerOptions) {
        super(client, options);
    }

    public runCooldowns(message: Interaction | Message, command: Command): boolean {
        const id = (message instanceof Message ? message.author : message.user).id;
        const ignorer = command.ignoreCooldown || this.ignoreCooldown;
        const isIgnored = Array.isArray(ignorer)
            ? ignorer.includes(id)
            : typeof ignorer === 'function'
                ? ignorer(message as Message, command)
                : id === ignorer;

        if (isIgnored) return false;

        const time = command.cooldown != null ? command.cooldown : this.defaultCooldown;
        if (!time) return false;

        const endTime = message.createdTimestamp + time;

        if (!this.cooldowns.has(id)) this.cooldowns.set(id, {});

        if (!this.cooldowns.get(id)[command.id]) {
            this.cooldowns.get(id)[command.id] = {
                timer: this.client.setTimeout(() => {
                    if (this.cooldowns.get(id)[command.id]) {
                        this.client.clearTimeout(this.cooldowns.get(id)[command.id].timer);
                    }
                    this.cooldowns.get(id)[command.id] = null;

                    if (!Object.keys(this.cooldowns.get(id)).length) {
                        this.cooldowns.delete(id);
                    }
                }, time),
                end: endTime,
                uses: 0
            };
        }

        const entry = this.cooldowns.get(id)[command.id];

        if (entry.uses >= command.ratelimit) {
            const end = this.cooldowns.get(id)[command.id].end;
            const diff = end - message.createdTimestamp;

            this.emit(Constants.CommandHandlerEvents.COOLDOWN, message, command, diff);
            return true;
        }

        entry.uses++;
        return false;
    }
}