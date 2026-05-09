import { Injectable } from "@nestjs/common";

export interface PingCommandResult {
	embeds: Array<Record<string, unknown>>;
}

export interface PingExecutionOptions {
	sourceTimestamp?: string;
}

const PING_EMBED_COLOR = 0xffb700;

@Injectable()
export class PingService {
	public execute(options: PingExecutionOptions = {}): PingCommandResult {
		const latency = this.calculateLatency(options.sourceTimestamp);
		const description =
			latency === null ? "Pong!" : `Pong! Roundtrip latency: ${latency}ms`;

		return {
			embeds: [
				{
					color: PING_EMBED_COLOR,
					description,
					title: "Pong!",
				},
			],
		};
	}

	private calculateLatency(sourceTimestamp?: string): number | null {
		if (!sourceTimestamp) {
			return null;
		}

		const sourceTime = Date.parse(sourceTimestamp);

		if (Number.isNaN(sourceTime)) {
			return null;
		}

		return Math.max(0, Date.now() - sourceTime);
	}
}
