import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "~/lib/utils";

export function Switch({
	className,
	...props
}: SwitchPrimitive.SwitchProps & { className?: string }) {
	return (
		<SwitchPrimitive.Root
			className={cn(
				"relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border border-white/12 bg-white/12 transition data-[state=checked]:border-sunset-300/40 data-[state=checked]:bg-linear-to-r data-[state=checked]:from-[#FDBB2D] data-[state=checked]:to-[#FF8C37]",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow-lg transition will-change-transform data-[state=checked]:translate-x-6" />
		</SwitchPrimitive.Root>
	);
}
