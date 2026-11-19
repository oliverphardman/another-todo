import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["integration/**/*.int.test.ts"],
		globalSetup: ["integration/dynamodb-local.ts"],
		testTimeout: 30000,
		hookTimeout: 120000,
	},
});
