import { build } from "esbuild";

const shared = {
	bundle: true,
	platform: "node",
	target: "node24",
	format: "esm",
	banner: {
		js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
	},
};

await build({ ...shared, entryPoints: ["src/lambda.ts"], outfile: "dist/index.mjs" });
await build({ ...shared, entryPoints: ["src/websocket/main.ts"], outfile: "dist/websocket.mjs" });
await build({
	...shared,
	entryPoints: ["src/server.ts"],
	outfile: "dist/server.mjs",
	external: ["bufferutil", "utf-8-validate"],
});
