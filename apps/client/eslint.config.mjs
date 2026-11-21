import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: [
			"dist",
			"coverage",
			".expo",
			"src/generated",
			"eslint.config.mjs",
			"metro.config.js",
			"react-native.config.js",
			"vitest.config.mts",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"no-warning-comments": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
	prettier,
);
