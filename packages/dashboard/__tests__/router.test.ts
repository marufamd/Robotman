import { describe, expect, it } from "vitest";
import { getRouter } from "../src/router";

describe("router preload behavior", () => {
	it("disables default hover preloading", () => {
		const router = getRouter();

		expect(router.options.defaultPreload).toBe(false);
	});
});
