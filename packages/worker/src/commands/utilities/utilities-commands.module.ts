import { Module } from "@nestjs/common";

import { COMMAND_HANDLERS } from "../commands.constants";
import type { CommandHandler } from "../command-handler";
import { RankingModule } from "../../ranking/ranking.module";
import { LeaderboardCommand } from "./leaderboard/leaderboard.command";
import { LeaderboardRendererService } from "./leaderboard/leaderboard-renderer.service";
import { SetColorCommand } from "./leaderboard/set-color.command";
import { PingCommand } from "./ping/ping.command";
import { PingService } from "./ping/ping.service";

@Module({
	imports: [RankingModule],
	providers: [
		LeaderboardCommand,
		LeaderboardRendererService,
		PingCommand,
		PingService,
		SetColorCommand,
		{
			provide: COMMAND_HANDLERS,
			useFactory: (
				pingCommand: PingCommand,
				leaderboardCommand: LeaderboardCommand,
				setColorCommand: SetColorCommand,
			): CommandHandler[] => [
				pingCommand,
				leaderboardCommand,
				setColorCommand,
			],
			inject: [PingCommand, LeaderboardCommand, SetColorCommand],
		},
	],
	exports: [COMMAND_HANDLERS],
})
export class UtilitiesCommandsModule {}
