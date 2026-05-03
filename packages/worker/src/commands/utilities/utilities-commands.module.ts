import { Module } from "@nestjs/common";

import { COMMAND_HANDLERS } from "../commands.constants";
import type { CommandHandler } from "../command-handler";
import { PingCommand } from "./ping/ping.command";
import { PingService } from "./ping/ping.service";

@Module({
	providers: [
		PingCommand,
		PingService,
		{
			provide: COMMAND_HANDLERS,
			useFactory: (pingCommand: PingCommand): CommandHandler[] => [
				pingCommand,
			],
			inject: [PingCommand],
		},
	],
	exports: [COMMAND_HANDLERS],
})
export class UtilitiesCommandsModule {}
