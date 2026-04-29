import { Injectable } from "@nestjs/common";

export interface PingCommandResult {
	embeds: Array<Record<string, unknown>>;
}

const PING_EMBED_COLOR = 0xffb700;

@Injectable()
export class PingService {
	public execute(): PingCommandResult {
		return {
			embeds: [
				{
					color: PING_EMBED_COLOR,
					description: "Pong!",
					title: "Pong!",
				},
			],
		};
	}
}
