import type { LabelHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label
			className={cn("text-sm font-semibold tracking-[0.01em] text-night-100", className)}
			{...props}
		/>
	);
}
