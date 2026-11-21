import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{ ignores: ["dist", "coverage", "src/generated"] },
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: { globals: globals.node },
		rules: {
			"no-warning-comments": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
	{
		files: ["src/domain/**", "src/application/**", "src/http/**", "src/mcp/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["**/infrastructure/**"],
							message: "Logic layers depend on ports, not providers.",
						},
						{
							group: ["@aws-sdk/*", "aws-jwt-verify", "aws-jwt-verify/*", "node:sqlite", "ws"],
							message: "Provider SDKs belong under src/infrastructure.",
						},
					],
				},
			],
		},
	},
);
