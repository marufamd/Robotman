import type { TextareaHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

export function Textarea({
	className,
	...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			className={cn(
				"min-h-28 w-full rounded-xl border border-white/10 bg-night-900/90 px-4 py-3 text-sm text-night-100 outline-none transition placeholder:text-night-200/45 focus:border-sunset-500 focus:ring-2 focus:ring-sunset-500/20",
				className,
			)}
			{...props}
		/>
	);
}
