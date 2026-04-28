import "reflect-metadata";

import { bootstrap } from "./main";

void bootstrap();

export { bootstrap, createMicroserviceOptions } from "./main";
export { WorkerModule } from "./worker.module";
export {
	HealthController,
	HEALTH_PING_PATTERN,
	type HealthPingResponse,
} from "./health/health.controller";
export { HealthModule } from "./health/health.module";
