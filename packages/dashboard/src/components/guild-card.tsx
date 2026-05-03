import { Link } from "@tanstack/react-router";
import type { GuildSummary } from "@robotman/shared";
import { ArrowRight } from "lucide-react";

export function GuildCard({ guild }: { guild: GuildSummary }) {
	return (
		<Link
			to="/guilds/$guildId/settings"
			params={{ guildId: guild.guildId }}
			preload={false}
			className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-950 rounded-2xl"
		>
			<div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-night-800 bg-night-900 transition-all duration-300 hover:-translate-y-1 hover:border-sunset-500/30 hover:shadow-[0_8px_30px_rgb(255,140,55,0.12)]">
				<div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-sunset-400 to-sunset-500" />
				<div className="relative h-24 bg-gradient-to-r from-sunset-900/10 to-sunset-800/10" />

				<div className="flex flex-1 flex-col px-6 pb-6 pt-0">
					<div className="relative -mt-10 mb-4 flex items-end justify-between">
						<div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-night-900 bg-night-950 shadow-xl">
							<img
								alt={`${guild.name} icon`}
								className="size-full object-cover"
								src={guild.iconUrl || "/icon.png"}
							/>
						</div>
						<span className="mb-2 rounded-full border border-sunset-500/20 bg-sunset-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-sunset-400">
							{guild.isOwner ? "Owner" : "Moderator"}
						</span>
					</div>

					<h3 className="mb-1 truncate font-display text-xl font-bold text-white">
						{guild.name}
					</h3>

					<div className="mb-6 mt-2 flex items-center gap-4 text-sm font-medium text-night-400">
						<div className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129,0.5)]" />
							Active
						</div>
						<div className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-night-600" />
							Configured
						</div>
					</div>

					<div className="mt-auto">
						<div className="group/btn flex w-full items-center justify-center gap-2 rounded-xl border border-night-800 bg-night-950 py-2.5 text-sm font-semibold text-night-200 shadow-sm transition-all group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-sunset-400 group-hover:to-sunset-500 group-hover:text-night-950 group-hover:shadow-[0_4px_14px_rgba(255,140,55,0.25)]">
							Manage Server
							<ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}
