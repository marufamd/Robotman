import { Module } from "@nestjs/common";

import { UtilitiesCommandsModule } from "./utilities/utilities-commands.module";

@Module({
	imports: [UtilitiesCommandsModule],
})
export class CommandsModule {}
