import { Injectable } from "@nestjs/common";

import type {
	CommandHandler,
	PrefixCommandExecutionContext,
	PrefixCommandExecutionResult,
	SlashCommandExecutionContext,
	SlashCommandExecutionResult,
} from "../../command-handler";
import {
	ROBOTMAN_DEFAULT_EMBED_COLOR,
} from "./color-utils";
import { LeaderboardRendererService } from "./leaderboard-renderer.service";
import { RankingService } from "../../../ranking/ranking.service";

const RANKING_DISABLED_MESSAGE = "Ranking is not enabled for this server.";
const RANKING_UNAVAILABLE_MESSAGE = "Ranking is only available in servers.";
const EMPTY_PAGE_MESSAGE = "There are no entries for that page.";

@Injectable()
export class LeaderboardCommand implements CommandHandler {
	public readonly definition = {
		name: "leaderboard",
		prefix: {
			aliases: ["top", "lb"],
			args: [
				{
					default: 1,
					name: "page",
					type: "integer",
				},
			],
		},
		slash: {},
	} as const;

	public constructor(
		private readonly leaderboardRendererService: LeaderboardRendererService,
		private readonly rankingService: RankingService,
	) {}

	public async executePrefix(
		context: PrefixCommandExecutionContext<{ page?: number }>,
	): Promise<PrefixCommandExecutionResult> {
		const result = await this.execute({
			guildIconUrl: context.event.payload.guildIconUrl,
			guildId: context.event.payload.guildId,
			guildName: context.event.payload.guildName,
			page: context.parsedCommand.args.page,
			prefix: context.parsedCommand.prefix,
			userId: context.event.payload.userId,
		});

		if (result.kind === "content") {
			return {
				content: result.content,
			};
		}

		return result.response;
	}

	public async executeSlash(
		context: SlashCommandExecutionContext,
	): Promise<SlashCommandExecutionResult> {
		const result = await this.execute({
			guildIconUrl: context.event.payload.guildIconUrl,
			guildId: context.event.payload.guildId,
			guildName: context.event.payload.guildName,
			page: this.readSlashPage(context.event.payload.options.page),
			prefix: await this.rankingService.getPrefixForGuild(
				context.event.payload.guildId,
			),
			userId: context.event.payload.userId,
		});

		if (result.kind === "content") {
			return {
				content: result.content,
				isEphemeral: result.ephemeral,
			};
		}

		return result.response;
	}

	private async execute(input: {
		guildIconUrl: string;
		guildId: string;
		guildName: string;
		page: number | undefined;
		prefix: string;
		userId: string;
	}): Promise<
		| {
				content: string;
				ephemeral: boolean;
				kind: "content";
		  }
		| {
				kind: "response";
				response: PrefixCommandExecutionResult & SlashCommandExecutionResult;
		  }
	> {
		if (!input.guildId) {
			return {
				content: RANKING_UNAVAILABLE_MESSAGE,
				ephemeral: true,
				kind: "content",
			};
		}

		if (!(await this.rankingService.isRankingEnabled(input.guildId))) {
			return {
				content: RANKING_DISABLED_MESSAGE,
				ephemeral: true,
				kind: "content",
			};
		}

		const page = this.rankingService.normalizePage(input.page ?? 1);
		const rows = await this.rankingService.getLeaderboardPage({
			guildId: input.guildId,
			page,
		});

		if (rows.length === 0) {
			return {
				content: EMPTY_PAGE_MESSAGE,
				ephemeral: true,
				kind: "content",
			};
		}

		const rankedUser = await this.rankingService.getRankedUser({
			guildId: input.guildId,
			userId: input.userId,
		});
		const imageBuffer = await this.leaderboardRendererService.render(
			rows.map((row, index) => ({
				color: row.color,
				displayName: row.displayName,
				rank: (page - 1) * 10 + index + 1,
				score: row.score,
			})),
		);

		return {
			kind: "response",
			response: {
				embeds: [
					{
						author: {
							icon_url: input.guildIconUrl || undefined,
							name: input.guildName
								? `${input.guildName} Leaderboard`
								: "Server Leaderboard",
						},
						color: rankedUser?.color ?? ROBOTMAN_DEFAULT_EMBED_COLOR,
						description: this.buildDescription(rankedUser, input.prefix),
						footer: {
							text: `Page ${page} • Type ${input.prefix}top ${page + 1} to go to Page ${page + 1}`,
						},
						image: {
							url: "attachment://lb.png",
						},
					},
				],
				files: [
					{
						contentType: "image/png",
						dataBase64: imageBuffer.toString("base64"),
						name: "lb.png",
					},
				],
			},
		};
	}

	private buildDescription(
		rankedUser: Awaited<ReturnType<RankingService["getRankedUser"]>>,
		prefix: string,
	): string {
		const summary = rankedUser
			? `You are rank **#${rankedUser.position}** with a score of **${rankedUser.score}**`
			: "You are not ranked yet in this server.";

		return [
			summary,
			`Type \`${prefix}setcolor <color>\` to update your leaderboard color.`,
		].join("\n");
	}

	private readSlashPage(value: unknown): number {
		if (typeof value === "number") {
			return value;
		}

		if (typeof value === "string") {
			return Number.parseInt(value, 10);
		}

		return 1;
	}
}
