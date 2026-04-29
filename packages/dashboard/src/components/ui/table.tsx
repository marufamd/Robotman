import type { HTMLAttributes, TableHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
	return <table className={cn("w-full border-separate border-spacing-0", className)} {...props} />;
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
	return <thead className={cn("text-left", className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
	return <tbody className={cn("[&_tr:last-child_td]:border-b-0", className)} {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
	return (
		<tr
			className={cn("transition hover:bg-white/[0.03]", className)}
			{...props}
		/>
	);
}

export function TH({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
	return (
		<th
			className={cn(
				"border-b border-white/8 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-night-200/68",
				className,
			)}
			{...props}
		/>
	);
}

export function TD({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
	return (
		<td
			className={cn("border-b border-white/8 px-4 py-4 align-top text-sm text-night-100", className)}
			{...props}
		/>
	);
}
