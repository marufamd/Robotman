import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";

export function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<Card className="w-full max-w-xl rounded-[32px]">
				<CardHeader>
					<p className="text-sm font-semibold uppercase tracking-[0.2em] text-sunset-200/75">
						Signal Lost
					</p>
					<h1 className="font-display text-3xl font-extrabold text-white">
						That dashboard route does not exist.
					</h1>
				</CardHeader>
				<CardContent>
					<Link to="/guilds">
						<Button>Back to Guilds</Button>
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
