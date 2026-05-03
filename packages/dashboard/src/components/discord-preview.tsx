import type { GuildSummary, UpsertAutoResponse } from "@robotman/shared";
import {
	DiscordEmbed,
	DiscordEmbedDescription,
	DiscordMessage,
	DiscordMention,
	DiscordMessages,
} from "@skyra/discord-components-react";
import type { ReactNode } from "react";
import { Badge } from "~/components/ui/badge";
import type { Session } from "~/lib/types";
import { discordColorToHex } from "~/lib/utils";

interface PreviewContext {
	channelName: string;
	guild: GuildSummary;
	session: Session;
}

function renderPreviewContent(content: string, previewContext: PreviewContext) {
	const parts = content.split(
		/(\{user\}|\{username\}|\{avatar\}|\{server\}|\{channel\})/g,
	);
	const displayName =
		previewContext.session.displayName || previewContext.session.username;

	return parts.map((part, index) => {
		switch (part) {
			case "{user}":
				return (
					<DiscordMention key={`user-${index}`} highlight type="user">
						{displayName}
					</DiscordMention>
				);
			case "{username}":
				return (
					<span key={`username-${index}`}>
						{previewContext.session.username}
					</span>
				);
			case "{avatar}":
				return (
					<span key={`avatar-${index}`}>
						{previewContext.session.avatarUrl ??
							"https://cdn.discordapp.com/embed/avatars/0.png"}
					</span>
				);
			case "{server}":
				return (
					<span key={`server-${index}`}>
						{previewContext.guild.name}
					</span>
				);
			case "{channel}":
				return (
					<DiscordMention key={`channel-${index}`} type="channel">
						{previewContext.channelName}
					</DiscordMention>
				);
			default:
				return part;
		}
	});
}

export function DiscordPreview({
	response,
	previewContext,
}: {
	response: UpsertAutoResponse;
	previewContext: PreviewContext;
}) {
	const previewContent = renderPreviewContent(
		response.content,
		previewContext,
	);
	const userAvatar =
		previewContext.session.avatarUrl ??
		"https://cdn.discordapp.com/embed/avatars/0.png";
	const userName =
		previewContext.session.displayName || previewContext.session.username;

	return (
		<div className="overflow-hidden rounded-[28px] border border-white/10 bg-night-950 shadow-2xl shadow-black/20">
			<div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
				<div>
					<p className="font-display text-xl font-bold text-white">
						Discord Preview
					</p>
					<p className="mt-1 text-sm text-night-200/68">
						Live render of the outgoing bot message.
					</p>
				</div>
				<Badge>{response.embed ? "Embed Mode" : "Text Mode"}</Badge>
			</div>

			<DiscordMessages className="space-y-3 p-5">
				<DiscordMessage author={userName} avatar={userAvatar}>
					{response.trigger || "trigger"}
				</DiscordMessage>
				<DiscordMessage author="Robotman" avatar="/icon.png" bot>
					{response.embed ? null : (previewContent as ReactNode[])}
					{response.embed ? (
						<DiscordEmbed
							slot="embeds"
							color={discordColorToHex(response.embedColor)}
						>
							<DiscordEmbedDescription slot="description">
								{previewContent as ReactNode[]}
							</DiscordEmbedDescription>
						</DiscordEmbed>
					) : null}
				</DiscordMessage>
			</DiscordMessages>
		</div>
	);
}
