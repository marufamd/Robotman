import { Link } from "@tanstack/react-router";
import type { GuildSummary } from "@robotman/shared";
import { ChevronRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function GuildCard({ guild }: { guild: GuildSummary }) {
	const initials = guild.name
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");

	return (
		<Link
			to="/guilds/$guildId/settings"
			params={{ guildId: guild.guildId }}
			className="block"
		>
			<Card className="group min-h-64 overflow-hidden rounded-[32px] transition hover:-translate-y-1 hover:border-sunset-300/30">
				<div className="h-2 bg-linear-to-r from-[#FDBB2D] to-[#FF8C37]" />
				<CardHeader className="gap-4">
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-4">
							{guild.iconUrl ? (
								<img
									alt={`${guild.name} icon`}
									className="size-16 rounded-2xl border border-white/10 object-cover"
									src={guild.iconUrl}
								/>
							) : (
								<div className="flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-[#FDBB2D] to-[#FF8C37] text-xl font-black text-night-950">
									{initials}
								</div>
							)}
							<div>
								<p className="font-display text-2xl font-bold text-white">{guild.name}</p>
								<p className="mt-1 text-sm text-night-200/70">Configure automations and settings</p>
							</div>
						</div>
						<ChevronRight className="text-night-200/45 transition group-hover:translate-x-1 group-hover:text-night-100" />
					</div>
				</CardHeader>
				<CardContent className="flex items-end justify-between gap-4">
					<Badge className="bg-white/6 text-night-100">
						{guild.isOwner ? "Owner Access" : "Manager Access"}
					</Badge>
					<p className="max-w-52 text-right text-sm text-night-200/65">
						Jump into response editing, server settings, and moderation toggles.
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}
