import type { UpsertAutoResponse } from "@robotman/shared";
import {
	DiscordEmbed,
	DiscordEmbedDescription,
	DiscordMessage,
	DiscordMessages,
} from "@skyra/discord-components-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { discordColorToHex } from "~/lib/utils";

export function DiscordPreview({ response }: { response: UpsertAutoResponse }) {
	return (
		<Card className="overflow-hidden rounded-[28px]">
			<div className="h-1.5 bg-linear-to-r from-[#FDBB2D] to-[#FF8C37]" />
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-display text-xl font-bold text-white">Discord Preview</p>
						<p className="mt-1 text-sm text-night-200/68">
							Live render of the outgoing bot message.
						</p>
					</div>
					<Badge>{response.embed ? "Embed Mode" : "Text Mode"}</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-[24px] border border-white/8 bg-[#313338] p-4">
					<DiscordMessages>
						<DiscordMessage
							author="Sunset Bot"
							avatar="https://dummyimage.com/128x128/fdbb2d/031427&text=R"
							bot
						>
							{response.embed ? null : response.content}
							{response.embed ? (
								<DiscordEmbed slot="embeds" color={discordColorToHex(response.embedColor)}>
									<DiscordEmbedDescription slot="description">
										{response.content}
									</DiscordEmbedDescription>
								</DiscordEmbed>
							) : null}
						</DiscordMessage>
					</DiscordMessages>
				</div>
			</CardContent>
		</Card>
	);
}
