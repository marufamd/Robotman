import { useState } from "react";
import {
	Link,
	Outlet,
	useLocation,
	useParams,
	useRouter,
} from "@tanstack/react-router";
import type { Session } from "~/lib/types";
import { cn } from "~/lib/utils";
import {
	LayoutDashboard,
	Bot,
	MessageSquareReply,
	History,
	Settings,
	HelpCircle,
	FileText,
	Plus,
	Bell,
	LogOut,
	Menu,
	X,
} from "lucide-react";
import { getApiBaseUrl, getDiscordClientId } from "~/lib/env";

function NavLink({
	to,
	params,
	label,
	isActive,
	icon: Icon,
	onClick,
}: {
	to: string;
	params?: Record<string, string>;
	label: string;
	isActive: boolean;
	icon: any;
	onClick?: () => void;
}) {
	return (
		<li>
			<Link
				to={to}
				params={params}
				preload={false}
				onClick={onClick}
				className={cn(
					"flex items-center gap-3 px-4 py-3 transition-all duration-200 active:scale-[0.97]",
					isActive
						? "rounded-r-lg border-l-4 border-sunset-500 bg-night-900/40 text-sunset-400"
						: "text-night-400 hover:bg-night-900/60 hover:text-white",
				)}
			>
				<Icon className="size-5" />
				{label}
			</Link>
		</li>
	);
}

export function DashboardShell({ session }: { session: Session }) {
	const location = useLocation();
	const router = useRouter();
	const { guildId } = useParams({ strict: false }) as { guildId?: string };
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const handleLogout = async () => {
		try {
			await fetch(`${getApiBaseUrl()}/session`, {
				method: "DELETE",
				credentials: "include",
			});
			router.invalidate();
			window.location.href = "/login";
		} catch (error) {
			console.error("Failed to logout:", error);
		}
	};

	const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${getDiscordClientId()}&permissions=2788686912&scope=bot+applications.commands`;

	return (
		<div className="flex min-h-screen w-full antialiased font-body text-body">
			{/* Backdrop */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm lg:hidden"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* SideNavBar */}
			<nav
				className={cn(
					"fixed left-0 top-0 z-20 flex h-screen w-64 flex-col border-r border-night-900 bg-[#020617] px-0 py-8 text-sm font-semibold tracking-tight text-sunset-500 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0",
					isSidebarOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<div className="mb-8 flex items-center gap-3 px-6">
					<div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg">
						<img
							alt="Robotman Logo"
							className="size-full object-cover"
							src="/icon.png"
						/>
					</div>
					<div>
						<h1 className="font-display text-2xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[#FFB700] to-[#FF8C00]">
							Robotman
						</h1>
					</div>
				</div>

				<div className="mb-6 px-4">
					<a
						href={inviteUrl}
						target="_blank"
						rel="noreferrer"
						className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FDBB2D] to-[#FF8C37] py-2.5 font-semibold !text-night-950 shadow-lg shadow-sunset-950/20 transition-all hover:brightness-110 cursor-pointer"
					>
						<Plus className="size-5" />
						Add New Server
					</a>
				</div>

				<ul className="flex flex-grow flex-col gap-1 overflow-y-auto px-2">
					<NavLink
						to="/guilds"
						label="Dashboard"
						icon={LayoutDashboard}
						isActive={location.pathname === "/guilds"}
						onClick={() => setIsSidebarOpen(false)}
					/>

					{guildId && (
						<>
							<NavLink
								to="/guilds/$guildId/settings"
								params={{ guildId }}
								label="Server Settings"
								icon={Settings}
								isActive={location.pathname.endsWith(
									"/settings",
								)}
								onClick={() => setIsSidebarOpen(false)}
							/>
							<NavLink
								to="/guilds/$guildId/auto-responses"
								params={{ guildId }}
								label="Auto Responses"
								icon={MessageSquareReply}
								isActive={location.pathname.endsWith(
									"/auto-responses",
								)}
								onClick={() => setIsSidebarOpen(false)}
							/>
							<NavLink
								to="/guilds/$guildId/audit-log"
								params={{ guildId }}
								label="Audit Log"
								icon={History}
								isActive={location.pathname.endsWith(
									"/audit-log",
								)}
								onClick={() => setIsSidebarOpen(false)}
							/>
						</>
					)}
				</ul>
			</nav>

			{/* Main Content Wrapper */}
			<div className="flex min-h-screen flex-1 flex-col lg:ml-64">
				{/* TopAppBar */}
				<header className="fixed right-0 top-0 z-10 flex h-16 w-full lg:w-[calc(100%-16rem)] items-center justify-between border-b border-night-900 bg-[#03091a]/80 px-4 lg:px-8 text-sm font-medium text-sunset-400 backdrop-blur-xl">
					<div className="flex items-center gap-4 lg:gap-6">
						<button
							onClick={() => setIsSidebarOpen(true)}
							className="text-night-400 transition-colors hover:text-white lg:hidden"
						>
							<Menu className="size-6" />
						</button>
						<span className="font-display text-lg font-bold text-white">
							{guildId ? "Server Management" : "Select a Server"}
						</span>
					</div>

					<div className="flex items-center gap-4">
						<button
							onClick={handleLogout}
							className="text-night-400 transition-colors hover:text-red-400 group relative flex items-center cursor-pointer"
							title="Logout"
						>
							<LogOut className="size-5" />
						</button>

						<div className="flex items-center gap-3">
							<div className="hidden text-right sm:block">
								<p className="text-sm font-bold text-white">
									{session.displayName || session.username}
								</p>
								<p className="font-semibold text-xs text-night-400">
									{session.username}
								</p>
							</div>
							<div className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-night-700 bg-night-800">
								{session.avatarUrl ? (
									<img
										alt={`${session.displayName} avatar`}
										className="size-full object-cover"
										src={session.avatarUrl}
									/>
								) : (
									<div className="flex size-full items-center justify-center bg-gradient-to-br from-[#FDBB2D] to-[#FF8C37] font-bold text-night-950 text-xs">
										{session.displayName[0]?.toUpperCase() ??
											"U"}
									</div>
								)}
							</div>
						</div>
					</div>
				</header>

				{/* Main Canvas */}
				<main className="mx-auto mt-16 flex-1 w-full max-w-[1440px] p-4 lg:p-10">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
