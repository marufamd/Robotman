import { Test, type TestingModule } from "@nestjs/testing";

import { COMMAND_HANDLERS } from "../src/commands/commands.constants";
import { CommandsRegistryService } from "../src/commands/commands.registry";
import type { CommandHandler } from "../src/commands/command-handler";

describe("CommandsRegistryService", () => {
	let service: CommandsRegistryService;

	const pingHandler: CommandHandler = {
		definition: {
			name: "ping",
			prefix: {
				aliases: ["pong"],
			},
			slash: {},
		},
		executePrefix: jest.fn(),
		executeSlash: jest.fn(),
	};

	const echoHandler: CommandHandler = {
		definition: {
			name: "echo",
			prefix: {},
		},
		executePrefix: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CommandsRegistryService,
				{
					provide: COMMAND_HANDLERS,
					useValue: [pingHandler, echoHandler],
				},
			],
		}).compile();

		service = module.get<CommandsRegistryService>(CommandsRegistryService);
	});

	it("returns registered prefix command definitions", () => {
		expect(service.getPrefixCommandDefinitions()).toEqual([
			{
				aliases: ["pong"],
				name: "ping",
			},
			{
				name: "echo",
			},
		]);
	});

	it("returns a handler by canonical command name", () => {
		expect(service.getCommandHandler("ping")).toBe(pingHandler);
		expect(service.getCommandHandler("echo")).toBe(echoHandler);
	});

	it("returns null for unknown handlers", () => {
		expect(service.getCommandHandler("missing")).toBeNull();
		expect(service.getSlashCommandHandler("missing")).toBeNull();
	});

	it("returns a handler by slash command name", () => {
		expect(service.getSlashCommandHandler("ping")).toBe(pingHandler);
	});

	it("throws when duplicate command names are registered", async () => {
		await expect(
			Test.createTestingModule({
				providers: [
					CommandsRegistryService,
					{
						provide: COMMAND_HANDLERS,
						useValue: [
							pingHandler,
							{
								definition: {
									name: "ping",
								},
							},
						],
					},
				],
			}).compile(),
		).rejects.toThrow('Duplicate command handler registered for "ping".');
	});
});
