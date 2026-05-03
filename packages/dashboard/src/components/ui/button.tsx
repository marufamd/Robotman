import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-400/80 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				primary:
					"bg-linear-to-r from-[#FFB700] to-[#FF8C00] text-night-950 shadow-[0_12px_32px_rgba(255,140,55,0.28)] hover:brightness-110",
				secondary:
					"border-white/10 bg-white/6 text-night-100 hover:border-white/20 hover:bg-white/10",
				ghost: "text-night-200 hover:bg-white/8",
				danger:
					"border-red-400/20 bg-red-500/10 text-red-100 hover:border-red-400/35 hover:bg-red-500/15",
			},
			size: {
				default: "h-10",
				sm: "h-8 rounded-lg px-3 text-xs",
				lg: "h-12 px-5 text-sm",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "default",
		},
	},
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

export function Button({ className, size, variant, ...props }: ButtonProps) {
	return <button className={cn(buttonVariants({ size, variant }), className)} {...props} />;
}
