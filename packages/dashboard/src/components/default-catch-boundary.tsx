import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<Card className="w-full max-w-xl rounded-[32px]">
				<CardHeader>
					<p className="text-sm font-semibold uppercase tracking-[0.2em] text-sunset-200/75">
						System Fault
					</p>
					<h1 className="font-display text-3xl font-extrabold text-white">
						The dashboard hit an unexpected edge.
					</h1>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm leading-6 text-night-200/72">{error.message}</p>
					<Button onClick={() => reset()}>Try Again</Button>
				</CardContent>
			</Card>
		</div>
	);
}
