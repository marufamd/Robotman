import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { GuildCard } from "~/components/guild-card";
import { getDiscordClientId } from "~/lib/env";
import { guildsQueryOptions } from "~/lib/queries";

export const Route = createFileRoute("/_authenticated/guilds/")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(guildsQueryOptions()),
	component: GuildSelectionPage,
});

export function GuildSelectionPage() {
	const { data: guilds } = useSuspenseQuery(guildsQueryOptions());
	const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${getDiscordClientId()}&permissions=2788686912&scope=bot+applications.commands`;

	return (
		<section className="w-full">
			<div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
				<div>
					<h2 className="mb-2 font-display text-4xl font-extrabold tracking-[-0.01em] text-white">
						Manage Servers
					</h2>
					<p className="text-base text-night-200/70">
						Select a server to configure Robotman modules and
						settings.
					</p>
				</div>
				<div className="relative w-full md:w-auto">
					<Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-night-400" />
					<input
						className="w-full rounded-xl border border-night-700/50 bg-night-800/40 py-2.5 pl-10 pr-4 text-white placeholder:text-night-400 focus:border-sunset-400/50 focus:outline-none focus:ring-1 focus:ring-sunset-400/50 md:w-72"
						placeholder="Search servers..."
						type="text"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				{guilds.map((guild) => (
					<GuildCard guild={guild} key={guild.guildId} />
				))}

				{/* Add New Card (Ghost) */}
				<a
					href={inviteUrl}
					target="_blank"
					rel="noreferrer"
					className="group flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-night-700 bg-night-900/30 transition-all duration-300 hover:border-sunset-400/50 hover:bg-night-800/40"
				>
					<div className="mb-4 flex size-16 items-center justify-center rounded-full border border-night-700 bg-night-800 transition-all group-hover:scale-110 group-hover:border-sunset-400/50 group-hover:bg-night-800">
						<Plus className="size-8 text-night-400 transition-colors group-hover:text-sunset-400" />
					</div>
					<span className="text-sm font-semibold tracking-wide text-night-400 transition-colors group-hover:text-sunset-300">
						Invite Bot to New Server
					</span>
				</a>
			</div>
		</section>
	);
}
