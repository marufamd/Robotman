import * as React from "react";
import { cn } from "~/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, children, ...props }, ref) => (
		<select
			ref={ref}
			className={cn(
				"h-10 w-full appearance-none rounded-xl border border-white/10 bg-night-950 pl-4 pr-10 text-sm text-white shadow-sm outline-none transition focus:border-sunset-400 disabled:cursor-not-allowed disabled:opacity-60 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22rgba(255,255,255,0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_1rem_center] bg-no-repeat",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	),
);

Select.displayName = "Select";
