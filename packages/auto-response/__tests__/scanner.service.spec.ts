import { Test, type TestingModule } from "@nestjs/testing";

import { RedisCacheService, type CachedTrigger } from "../src/redis/cache.service";
import { ScannerService } from "../src/scanner/scanner.service";

describe("ScannerService", () => {
	let service: ScannerService;
	let redisCacheService: {
		getTriggers: jest.Mock<Promise<CachedTrigger[] | null>, [string]>;
	};

	beforeEach(async () => {
		redisCacheService = {
			getTriggers: jest.fn<Promise<CachedTrigger[] | null>, [string]>(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ScannerService,
				{
					provide: RedisCacheService,
					useValue: redisCacheService,
				},
			],
		}).compile();

		service = module.get<ScannerService>(ScannerService);
	});

	it("ignores bot-authored messages", async () => {
		await expect(service.findReply("hello", "guild-1", true)).resolves.toBeNull();
		expect(redisCacheService.getTriggers).not.toHaveBeenCalled();
	});

	it("returns null on cache miss", async () => {
		redisCacheService.getTriggers.mockResolvedValue(null);

		await expect(service.findReply("hello", "guild-1", false)).resolves.toBeNull();
		expect(redisCacheService.getTriggers).toHaveBeenCalledWith("guild-1");
	});

	it("matches regex triggers from Redis cache", async () => {
		redisCacheService.getTriggers.mockResolvedValue([
			{
				content: "pong",
				patterns: ["^ping$"],
				responseId: "response-1",
				wildcard: false,
			},
		]);

		await expect(service.findReply("ping", "guild-2", false)).resolves.toBe(
			"pong",
		);
	});

	it("matches wildcard triggers from Redis cache", async () => {
		redisCacheService.getTriggers.mockResolvedValue([
			{
				content: "matched wildcard",
				patterns: ["hello*world"],
				responseId: "response-2",
				wildcard: true,
			},
		]);

		await expect(
			service.findReply("hello brave world", "guild-3", false),
		).resolves.toBe("matched wildcard");
	});

	it("skips invalid regex patterns and keeps scanning", async () => {
		redisCacheService.getTriggers.mockResolvedValue([
			{
				content: "bad",
				patterns: ["("],
				responseId: "response-3",
				wildcard: false,
			},
			{
				content: "good",
				patterns: ["world$"],
				responseId: "response-4",
				wildcard: false,
			},
		]);

		await expect(service.findReply("hello world", "guild-4", false)).resolves.toBe(
			"good",
		);
	});
});
