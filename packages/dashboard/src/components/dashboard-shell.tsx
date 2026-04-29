import { Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
import type { Session } from "~/lib/types";
import { cn } from "~/lib/utils";

function LogoMark() {
	return (
		<div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#FDBB2D] to-[#FF8C37] text-lg font-black text-night-950 shadow-[0_12px_32px_rgba(255,140,55,0.28)]">
			R
		</div>
	);
}

function NavLink({
	to,
	params,
	label,
	isActive,
}: {
	to: string;
	params?: Record<string, string>;
	label: string;
	isActive: boolean;
}) {
	return (
		<Link
			to={to}
			params={params}
			className={cn(
				"rounded-2xl border px-4 py-3 text-sm font-semibold transition",
				isActive
					? "border-sunset-300/30 bg-linear-to-r from-[#FFB700] to-[#FF8C00] text-night-950"
					: "border-white/6 bg-white/4 text-night-200/75 hover:border-white/12 hover:text-night-100",
			)}
		>
			{label}
		</Link>
	);
}

export function DashboardShell({ session }: { session: Session }) {
	const location = useLocation();
	const params = useParams({ strict: false });
	const guildId = typeof params.guildId === "string" ? params.guildId : undefined;

	return (
		<div className="min-h-screen bg-transparent">
			<div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-6 px-4 py-6 md:px-10">
				<aside className="glass-panel hidden w-76 shrink-0 rounded-[32px] p-6 lg:flex lg:flex-col">
					<div className="flex items-center gap-4">
						<LogoMark />
						<div>
							<p className="font-display text-xl font-extrabold text-white">Sunset Bot</p>
							<p className="text-sm text-night-200/65">Dashboard control center</p>
						</div>
					</div>

					<nav className="mt-8 flex flex-col gap-3">
						<NavLink
							to="/guilds"
							label="Guilds"
							isActive={location.pathname === "/guilds"}
						/>
						{guildId ? (
							<>
								<NavLink
									to="/guilds/$guildId/settings"
									params={{ guildId }}
									label="Server Settings"
									isActive={location.pathname.endsWith("/settings")}
								/>
								<NavLink
									to="/guilds/$guildId/auto-responses"
									params={{ guildId }}
									label="Auto Responses"
									isActive={location.pathname.endsWith("/auto-responses")}
								/>
							</>
						) : null}
					</nav>

					<div className="mt-auto rounded-[28px] border border-white/8 bg-white/5 p-5">
						<p className="font-display text-lg font-bold text-white">Golden Hour Control</p>
						<p className="mt-2 text-sm leading-6 text-night-200/68">
							High-contrast, fast management for community operators who need clean bot controls.
						</p>
					</div>
				</aside>

				<div className="min-w-0 flex-1">
					<header className="glass-panel sticky top-4 z-20 mb-6 flex w-full items-center justify-between rounded-[28px] px-6 py-4">
						<div>
							<p className="text-sm font-semibold uppercase tracking-[0.2em] text-sunset-200/80">
								Sunset Bot Dashboard
							</p>
							<p className="mt-1 font-display text-2xl font-bold text-white">
								{guildId ? "Guild Management" : "Server Control Center"}
							</p>
						</div>
						<div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
							<div className="hidden text-right sm:block">
								<p className="text-sm font-semibold text-white">{session.username}</p>
								<p className="text-xs text-night-200/65">Connected via Discord OAuth</p>
							</div>
							{session.avatarUrl ? (
								<img
									alt={`${session.username} avatar`}
									className="size-11 rounded-2xl border border-white/8 object-cover"
									src={session.avatarUrl}
								/>
							) : (
								<div className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-[#FDBB2D] to-[#FF8C37] font-bold text-night-950">
									{session.username[0]?.toUpperCase() ?? "U"}
								</div>
							)}
						</div>
					</header>

					<Outlet />
				</div>
			</div>
		</div>
	);
}
