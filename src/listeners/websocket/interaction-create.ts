import { Listener } from 'discord-akairo';
import { APIInteraction } from 'discord-api-types';

export default class extends Listener {
    public constructor() {
        super('interaction-create', {
            event: 'INTERACTION_CREATE',
            emitter: 'ws'
        });
    }

    public exec(data: APIInteraction): void {
        void this.client.interactionHandler.handle(data);
        void this.client.config.stat('commands_run');
    }
}