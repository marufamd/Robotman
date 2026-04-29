import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver — add a no-op polyfill for Radix UI
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};
