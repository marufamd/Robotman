import { Injectable } from "@nestjs/common";

import type {
	CommandHandler,
	PrefixCommandExecutionContext,
	PrefixCommandExecutionResult,
} from "../../command-handler";
import { RankingService } from "../../../ranking/ranking.service";
import {
	formatHexColor,
	parseLeaderboardColorArgument,
} from "./color-utils";

@Injectable()
export class SetColorCommand implements CommandHandler<{ color: number }> {
	public readonly definition = {
		name: "setcolor",
		prefix: {
			aliases: ["set-colour"],
			args: [
				{
					match: "content",
					name: "color",
					required: true,
					type: parseLeaderboardColorArgument,
				},
			],
		},
	} as const;

	public constructor(private readonly rankingService: RankingService) {}

	public async executePrefix(
		context: PrefixCommandExecutionContext<{ color: number }>,
	): Promise<PrefixCommandExecutionResult> {
		if (!context.event.payload.guildId) {
			return {
				content: "This command can only be used in a server.",
			};
		}

		await this.rankingService.setColor({
			color: context.parsedCommand.args.color,
			displayName:
				context.event.payload.memberDisplayName || context.event.payload.userId,
			guildId: context.event.payload.guildId,
			userId: context.event.payload.userId,
		});

		return {
			embeds: [
				{
					color: context.parsedCommand.args.color,
					description: `Updated your leaderboard colour to ${formatHexColor(context.parsedCommand.args.color)}`,
					title: "Leaderboard Color Updated",
				},
			],
		};
	}
}
