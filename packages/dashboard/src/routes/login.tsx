import { useEffect, useState } from "react";
import { ArrowRight, Bot, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { getApiBaseUrl, getDiscordOauthUrl } from "~/lib/env";

export function LoginPage() {
	const [csrfToken, setCsrfToken] = useState<string | null>(null);
	const [originTarget, setOriginTarget] = useState("http://localhost:3000/guilds");

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
			const redirect = new URLSearchParams(window.location.search).get("redirect");
			const path = redirect && redirect.startsWith("/") ? redirect : "/guilds";
			setOriginTarget(`${window.location.origin}${path}`);
		}

		return () => {
			active = false;
		};
	}, []);

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
			<div className="absolute left-[-10%] top-16 size-72 rounded-full bg-[#FF8C37]/18 blur-3xl" />
			<div className="absolute right-[-5%] top-24 size-80 rounded-full bg-[#FDBB2D]/14 blur-3xl" />
			<div className="absolute bottom-0 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-[#FF8C37]/12 blur-3xl" />

			<Card className="relative w-full max-w-6xl overflow-hidden rounded-[40px]">
				<div className="grid min-h-[720px] lg:grid-cols-[1.15fr_0.85fr]">
					<div className="relative overflow-hidden border-b border-white/8 px-8 py-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-14">
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(253,187,45,0.18),transparent_26%),radial-gradient(circle_at_center_right,rgba(255,140,55,0.2),transparent_26%)]" />
						<div className="relative z-10 max-w-2xl">
							<div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-sunset-200">
								<Sparkles className="size-4" />
								Golden-hour control for modern Discord communities
							</div>
							<h1 className="mt-8 font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white md:text-6xl">
								Manage Sunset Bot with a dashboard built for speed, clarity, and control.
							</h1>
							<p className="mt-6 max-w-xl text-lg leading-8 text-night-200/76">
								Route into Discord OAuth, pick a guild, tune automations, and preview every response before it goes live.
							</p>

							<div className="mt-12 grid gap-4 md:grid-cols-3">
								<FeatureTile icon={Bot} label="Trigger Automation" />
								<FeatureTile icon={ShieldCheck} label="Server Guardrails" />
								<FeatureTile icon={Sparkles} label="Live Message Preview" />
							</div>
						</div>
					</div>

					<div className="flex items-center px-8 py-10 lg:px-14">
						<div className="w-full">
							<p className="text-sm font-semibold uppercase tracking-[0.22em] text-sunset-200/75">
								Discord OAuth
							</p>
							<h2 className="mt-4 font-display text-4xl font-bold text-white">
								Sign in to your guild workspace
							</h2>
							<p className="mt-4 max-w-md text-base leading-7 text-night-200/70">
								Authenticate with Discord to access guild settings, auto responses, and upcoming management tools.
							</p>

							<form action={getDiscordOauthUrl()} className="mt-10 inline-flex" method="post">
								<input name="authenticity_token" type="hidden" value={csrfToken ?? ""} />
								<input name="origin" type="hidden" value={originTarget} />
								<Button className="min-w-60" disabled={!csrfToken} size="lg" type="submit">
									Continue with Discord
									<ArrowRight className="ml-2 size-4" />
								</Button>
							</form>

							<div className="mt-8 rounded-[28px] border border-white/8 bg-white/5 p-5">
								<p className="font-semibold text-white">No guest mode</p>
								<p className="mt-2 text-sm leading-6 text-night-200/68">
									Every dashboard session is tied directly to Discord OAuth so server permissions stay authoritative.
								</p>
							</div>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}

function FeatureTile({
	icon: Icon,
	label,
}: {
	icon: typeof Bot;
	label: string;
}) {
	return (
		<div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
			<Icon className="size-5 text-sunset-300" />
			<p className="mt-4 font-semibold text-white">{label}</p>
		</div>
	);
}
