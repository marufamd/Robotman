import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getApiBaseUrl, getDiscordOauthUrl } from "~/lib/env";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

export function LoginPage() {
	const [csrfToken, setCsrfToken] = useState<string | null>(null);
	const [originTarget, setOriginTarget] = useState(
		"http://localhost:3000/guilds",
	);

	useEffect(() => {
		let active = true;

		void fetch(`${getApiBaseUrl()}/csrf`, {
			credentials: "include",
		})
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Failed to load CSRF token");
				}

				return (await response.json()) as { csrfToken?: string };
			})
			.then((payload) => {
				if (active) {
					setCsrfToken(payload.csrfToken ?? null);
				}
			})
			.catch(() => {
				if (active) {
					setCsrfToken(null);
				}
			});

		if (typeof window !== "undefined") {
			const redirect = new URLSearchParams(window.location.search).get(
				"redirect",
			);
			const path =
				redirect && redirect.startsWith("/") ? redirect : "/guilds";
			setOriginTarget(`${window.location.origin}${path}`);
		}

		return () => {
			active = false;
		};
	}, []);

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night-950 px-4 py-10">
			{/* Background Decor */}
			<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
				<div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-sunset-400/20 to-sunset-500/20 mix-blend-screen blur-[100px] opacity-50" />
				<div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-sunset-300/10 mix-blend-screen blur-[80px]" />
				<div className="absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-sunset-400/10 mix-blend-screen blur-[80px]" />
			</div>

			{/* Main Content Canvas */}
			<main className="relative z-10 flex w-full max-w-md flex-col items-center justify-center px-6 text-center">
				{/* Logo Container with Glassmorphism backing */}
				<div className="mb-8 rounded-3xl border border-night-700/50 bg-night-850/40 p-4 shadow-[0_0_40px_rgba(255,140,55,0.15)] backdrop-blur-xl">
					<div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sunset-400 to-sunset-500 p-[2px]">
						<div className="flex h-full w-full items-center justify-center rounded-full bg-night-950">
							<img
								alt="Robotman Logo"
								className="h-full w-full object-cover"
								src="/icon.png"
							/>
						</div>
					</div>
				</div>

				{/* Typography */}
				<div className="mb-8 flex flex-col gap-2">
					<h1 className="bg-gradient-to-r from-sunset-400 to-sunset-500 bg-clip-text font-display text-5xl font-extrabold tracking-[-0.02em] text-transparent drop-shadow-sm">
						Robotman
					</h1>
					<p className="text-lg text-[#bec6e0]/80">
						Manage your Discord server settings from a single,
						unified interface.
					</p>
				</div>

				{/* Action Area */}
				<div className="flex w-full flex-col gap-4">
					<form
						action={getDiscordOauthUrl()}
						className="flex w-full flex-col"
						method="post"
					>
						<input
							name="authenticity_token"
							type="hidden"
							value={csrfToken ?? ""}
						/>
						<input
							name="origin"
							type="hidden"
							value={originTarget}
						/>
						<button
							className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sunset-400 to-sunset-500 px-6 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#fcd06a] hover:to-[#ffa666] hover:shadow-[0_12px_24px_rgba(255,140,55,0.4)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_8px_20px_rgba(255,140,55,0.25)]"
							disabled={!csrfToken}
							type="submit"
						>
							<svg
								className="h-6 w-6 text-night-950 transition-transform group-hover:scale-110"
								fill="currentColor"
								viewBox="0 0 24 24"
							>
								<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
							</svg>
							<span className="text-sm font-semibold tracking-[0.01em] text-night-950">
								Login with Discord
							</span>
						</button>
					</form>
				</div>
			</main>
		</div>
	);
}
