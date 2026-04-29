export function seo(title: string, description: string) {
	return [
		{ title },
		{ name: "description", content: description },
	];
}
