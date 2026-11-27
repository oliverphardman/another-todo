import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

interface Context {
	originModulePath: string;
	resolveRequest: (context: Context, moduleName: string, platform: string) => unknown;
}

interface MetroConfig {
	resolver: { resolveRequest: Context["resolveRequest"] };
}

const load = createRequire(join(process.cwd(), "metro.config.js"));
const config = load("./metro.config.js") as MetroConfig;
const origin = "/app/assets/themes/aurora.jpg";

function resolve(moduleName: string, platform: string) {
	const resolveRequest = vi.fn<Context["resolveRequest"]>();
	config.resolver.resolveRequest(
		{ originModulePath: origin, resolveRequest },
		moduleName,
		platform,
	);
	const [context, resolved] = resolveRequest.mock.calls[0]!;
	return { origin: context.originModulePath, moduleName: resolved };
}

describe.each([
	["windows", "react-native-windows"],
	["macos", "react-native-macos"],
])("Metro resolution on %s", (platform, fork) => {
	it("resolves the asset registry of bundled images from the fork", () => {
		const result = resolve("@react-native/assets-registry/registry", platform);

		expect(result.moduleName).toBe("@react-native/assets-registry/registry");
		expect(result.origin).toBe(load.resolve(`${fork}/package.json`));
		expect(() => createRequire(result.origin).resolve(result.moduleName)).not.toThrow();
	});

	it("redirects React Native to the fork", () => {
		expect(resolve("react-native", platform).moduleName).toBe(fork);
		expect(resolve("react-native/Libraries/Image/Image", platform).moduleName).toBe(
			`${fork}/Libraries/Image/Image`,
		);
	});

	it("leaves other modules alone", () => {
		expect(resolve("react-native-svg", platform)).toEqual({
			origin,
			moduleName: "react-native-svg",
		});
	});
});

describe.each(["ios", "android", "web"])("Metro resolution on %s", (platform) => {
	it.each(["react-native", "@react-native/assets-registry/registry"])(
		"leaves %s alone",
		(moduleName) => {
			expect(resolve(moduleName, platform)).toEqual({ origin, moduleName });
		},
	);
});
