export function FieldError({ errors }: { errors: unknown[] }) {
	if (errors.length === 0) {
		return null;
	}

	const firstError = errors[0];
	const message =
		typeof firstError === "object" && firstError !== null && "message" in firstError
			? String((firstError as any).message)
			: String(firstError);

	return <p className="text-sm text-red-200">{message}</p>;
}
