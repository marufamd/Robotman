import { Test, type TestingModule } from "@nestjs/testing";

import {
	CommandParserService,
	type ParsedCommand,
} from "../src/command-parser/command-parser.service";
import { RedisCacheService } from "../src/redis/cache.service";

describe("CommandParserService", () => {
	let service: CommandParserService;
	let redisCacheService: {
		getPrefix: jest.Mock<Promise<string | null>, [string]>;
	};

	beforeEach(async () => {
		redisCacheService = {
			getPrefix: jest.fn<Promise<string | null>, [string]>(),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CommandParserService,
				{
					provide: RedisCacheService,
					useValue: redisCacheService,
				},
			],
		}).compile();

		service = module.get<CommandParserService>(CommandParserService);
	});

	it("returns null for bot-authored messages", async () => {
		await expect(service.parseMessage("!ping", "guild-1", true)).resolves.toBeNull();
		expect(redisCacheService.getPrefix).not.toHaveBeenCalled();
	});

	it("uses the cached guild prefix when parsing a valid command", async () => {
		redisCacheService.getPrefix.mockResolvedValue("?");

		const parsed = await service.parseMessage("?ping alpha beta", "guild-2", false);

		const expected: ParsedCommand = {
			args: ["alpha", "beta"],
			commandName: "ping",
		};

		expect(parsed).toEqual(expected);
		expect(redisCacheService.getPrefix).toHaveBeenCalledWith("guild-2");
	});

	it("falls back to ! when no cached prefix exists", async () => {
		redisCacheService.getPrefix.mockResolvedValue(null);

		await expect(service.parseMessage("!ping", "guild-3", false)).resolves.toEqual({
			args: [],
			commandName: "ping",
		});
	});

	it("returns null when the content does not match the guild prefix", async () => {
		redisCacheService.getPrefix.mockResolvedValue("$");

		await expect(service.parseMessage("!ping", "guild-4", false)).resolves.toBeNull();
	});

	it("returns null when the message contains only the prefix", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(service.parseMessage("!", "guild-5", false)).resolves.toBeNull();
	});
});
