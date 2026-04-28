import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";

export const HEALTH_PING_PATTERN = "health.ping";

export interface HealthPingResponse {
	service: "worker";
	status: "ok";
	transport: "rmq";
}

@Controller()
export class HealthController {
	@MessagePattern(HEALTH_PING_PATTERN)
	public ping(): HealthPingResponse {
		return {
			service: "worker",
			status: "ok",
			transport: "rmq",
		};
	}
}
