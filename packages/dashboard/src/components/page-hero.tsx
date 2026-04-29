import { Badge } from "~/components/ui/badge";

export function PageHero({
	eyebrow,
	title,
	description,
	badge,
}: {
	eyebrow: string;
	title: string;
	description: string;
	badge?: string;
}) {
	return (
		<div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div>
				<p className="text-sm font-semibold uppercase tracking-[0.24em] text-sunset-200/75">
					{eyebrow}
				</p>
				<h1 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.02em] text-white">
					{title}
				</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-night-200/72">{description}</p>
			</div>
			{badge ? <Badge className="self-start md:self-auto">{badge}</Badge> : null}
		</div>
	);
}
