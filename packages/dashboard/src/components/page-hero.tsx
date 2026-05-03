import { Badge } from "~/components/ui/badge";

export function PageHero({
	eyebrow,
	title,
	description,
	badge,
	iconUrl,
	action,
}: {
	eyebrow: string;
	title: string;
	description: string;
	badge?: string;
	iconUrl?: string | null;
	action?: React.ReactNode;
}) {
	return (
		<div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div className="flex flex-col gap-4 md:flex-row md:items-center">
				{iconUrl ? (
					<div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
						<img
							src={iconUrl}
							alt={title}
							className="size-full object-cover"
						/>
					</div>
				) : null}
				<div>
					<p className="text-sm font-semibold uppercase tracking-[0.24em] text-sunset-200/75">
						{eyebrow}
					</p>
					<h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.02em] text-white">
						{title}
					</h1>
					<p className="mt-3 max-w-2xl text-base leading-7 text-night-200/72">
						{description}
					</p>
				</div>
			</div>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				{badge ? (
					<Badge className="self-start sm:self-auto text-center">
						{badge}
					</Badge>
				) : null}
				{action}
			</div>
		</div>
	);
}
