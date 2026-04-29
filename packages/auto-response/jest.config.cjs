module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	roots: ["<rootDir>/__tests__"],
	moduleFileExtensions: ["ts", "js", "json"],
	moduleNameMapper: {
		"^@robotman/shared$": "<rootDir>/../shared/index.ts",
	},
};
