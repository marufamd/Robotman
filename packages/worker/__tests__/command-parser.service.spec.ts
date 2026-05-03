import { Test, type TestingModule } from "@nestjs/testing";

import {
	CommandParserService,
} from "../src/command-parser/command-parser.service";
import type { PrefixCommandDefinition } from "../src/commands/command-handler";
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

	const commandDefinitions: readonly PrefixCommandDefinition[] = [
		{
			aliases: ["pong"],
			name: "ping",
		},
		{
			args: [
				{
					name: "query",
					match: "content",
					required: true,
				},
				{
					default: 1,
					flags: ["amount", "a"],
					match: "option",
					name: "amount",
					type: "integer",
				},
				{
					flags: ["all"],
					match: "flag",
					name: "all",
				},
			],
			name: "search",
		},
		{
			args: [
				{
					name: "count",
					required: true,
					type: "integer",
				},
			],
			name: "roll",
		},
		{
			args: [
				{
					name: "text",
					required: true,
					type: "string",
				},
				{
					name: "shout",
					type: "uppercase",
				},
				{
					name: "rest",
					match: "rest",
				},
			],
			name: "echo",
		},
	];

	it("returns null for bot-authored messages", async () => {
		await expect(
			service.parseMessage("!ping", "guild-1", true, commandDefinitions),
		).resolves.toBeNull();
		expect(redisCacheService.getPrefix).not.toHaveBeenCalled();
	});

	it("uses cached guild prefix and resolves aliases to canonical command names", async () => {
		redisCacheService.getPrefix.mockResolvedValue("?");

		await expect(
			service.parseMessage("?PoNg", "guild-2", false, commandDefinitions),
		).resolves.toEqual({
			alias: "pong",
			args: {},
			commandName: "ping",
			orderedArgs: [],
			prefix: "?",
			remainder: "",
		});
		expect(redisCacheService.getPrefix).toHaveBeenCalledWith("guild-2");
	});

	it("falls back to ! when no cached prefix exists", async () => {
		redisCacheService.getPrefix.mockResolvedValue(null);

		await expect(
			service.parseMessage("!ping", "guild-3", false, commandDefinitions),
		).resolves.toEqual({
			alias: "ping",
			args: {},
			commandName: "ping",
			orderedArgs: [],
			prefix: "!",
			remainder: "",
		});
	});

	it("returns null when the content does not match the guild prefix", async () => {
		redisCacheService.getPrefix.mockResolvedValue("$");

		await expect(
			service.parseMessage("!ping", "guild-4", false, commandDefinitions),
		).resolves.toBeNull();
	});

	it("returns null when the message contains only the prefix", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(
			service.parseMessage("!", "guild-5", false, commandDefinitions),
		).resolves.toBeNull();
	});

	it("parses quoted content, options, and flags with straight quotes", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(
			service.parseMessage(
				'!search "hello world" --amount=3 --all',
				"guild-6",
				false,
				commandDefinitions,
				"user-6",
			),
		).resolves.toEqual({
			alias: "search",
			args: {
				all: true,
				amount: 3,
				query: "hello world",
			},
			commandName: "search",
			orderedArgs: ["hello world"],
			prefix: "!",
			remainder: "hello world",
		});
	});

	it("parses smart quotes and default option values", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(
			service.parseMessage(
				"!search “hello world”",
				"guild-7",
				false,
				commandDefinitions,
			),
		).resolves.toEqual({
			alias: "search",
			args: {
				all: false,
				amount: 1,
				query: "hello world",
			},
			commandName: "search",
			orderedArgs: ["hello world"],
			prefix: "!",
			remainder: "hello world",
		});
	});

	it("parses mixed single, transformed, and rest arguments", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(
			service.parseMessage(
				"!echo alpha bravo charlie delta",
				"guild-8",
				false,
				commandDefinitions,
			),
		).resolves.toEqual({
			alias: "echo",
			args: {
				rest: "charlie delta",
				shout: "BRAVO",
				text: "alpha",
			},
			commandName: "echo",
			orderedArgs: ["alpha", "bravo", "charlie", "delta"],
			prefix: "!",
			remainder: "alpha bravo charlie delta",
		});
	});

	it("returns null for unknown commands", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(
			service.parseMessage("!unknown", "guild-9", false, commandDefinitions),
		).resolves.toBeNull();
	});

	it("returns null when a required argument fails coercion", async () => {
		redisCacheService.getPrefix.mockResolvedValue("!");

		await expect(
			service.parseMessage("!roll nope", "guild-10", false, commandDefinitions),
		).resolves.toBeNull();
	});
});
