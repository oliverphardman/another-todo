import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const stub = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	define: { __DEV__: true },
	resolve: {
		alias: {
			"react-native-svg": stub("./test/support/react-native-svg.tsx"),
			"react-native": "react-native-web",
		},
	},
	test: {
		environment: "jsdom",
		include: ["test/**/*.test.{ts,tsx}"],
		setupFiles: ["./test/support/setup.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}", "App.tsx", "index.ts", "index.macos.ts", "index.windows.ts"],
			exclude: ["src/generated/**"],
			thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
		},
	},
});
