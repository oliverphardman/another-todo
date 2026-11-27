import { NativeModules } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasImageSampler, type CanvasEnvironment } from "../src/photos/canvas-image-sampler";
import { createImageSampler } from "../src/photos/create-image-sampler";
import { createImageSampler as createAndroid } from "../src/photos/create-image-sampler.android";
import { createImageSampler as createIos } from "../src/photos/create-image-sampler.ios";
import { createImageSampler as createMac } from "../src/photos/create-image-sampler.macos";
import { createImageSampler as createWindows } from "../src/photos/create-image-sampler.windows";
import { NativeImageSampler } from "../src/photos/native-image-sampler";
import { PhotoTones } from "../src/photos/photo-tones";
import { FakeImageSampler } from "./support/fakes";

vi.mock("expo", () => ({
	requireOptionalNativeModule: () => ({ averageColor: async () => "#123456" }),
}));

const BAND = { from: 0.75, to: 1 };
const modules = NativeModules as Record<string, unknown>;

afterEach(() => {
	delete modules.AnotherToDoImages;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function environment(context: unknown, status = 200) {
	const requests: [string, RequestInit][] = [];
	const canvas = { width: 0, height: 0, getContext: () => context };
	const value: CanvasEnvironment = {
		fetch: async (url, init) => {
			requests.push([url, init]);
			return new Response("image", { status });
		},
		decode: async () => ({}) as CanvasImageSource,
		createCanvas: () => canvas as unknown as HTMLCanvasElement,
	};
	return { value, requests, canvas };
}

describe("CanvasImageSampler", () => {
	it("averages the pixels in the band", async () => {
		const areas: number[][] = [];
		const context = {
			drawImage: () => undefined,
			getImageData: (...area: number[]) => {
				areas.push(area);
				return { data: new Uint8ClampedArray([0, 10, 200, 255, 10, 20, 250, 255]) };
			},
		};
		const { value, requests, canvas } = environment(context);
		expect(await new CanvasImageSampler(value).averageColor("https://p.test/a", BAND)).toBe(
			"#050fe1",
		);
		expect(areas).toEqual([[0, 24, 32, 8]]);
		expect(canvas.width).toBe(32);
		expect(requests).toEqual([["https://p.test/a", { mode: "cors", cache: "reload" }]]);
	});

	it("gives up when the image is refused or there is no canvas", async () => {
		const refused = environment({}, 403);
		expect(await new CanvasImageSampler(refused.value).averageColor("u", BAND)).toBeNull();
		const blind = environment(null);
		expect(await new CanvasImageSampler(blind.value).averageColor("u", BAND)).toBeNull();
	});

	it("uses the browser's fetch, decoder and canvas", async () => {
		vi.stubGlobal("fetch", async () => new Response("image"));
		vi.stubGlobal("createImageBitmap", async () => ({}));
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
		expect(await createImageSampler().averageColor("u", BAND)).toBeNull();
	});
});

describe("NativeImageSampler", () => {
	it("asks the native module for the band", async () => {
		const averageColor = vi.fn(async () => "#abcdef");
		const sampler = new NativeImageSampler({ averageColor });
		expect(await sampler.averageColor("u", BAND)).toBe("#abcdef");
		expect(averageColor).toHaveBeenCalledWith("u", 0.75, 1);
	});

	it("knows nothing without a module", async () => {
		expect(await new NativeImageSampler(null).averageColor("u", BAND)).toBeNull();
		expect(await createWindows().averageColor("u", BAND)).toBeNull();
		expect(await createMac().averageColor("u", BAND)).toBeNull();
	});

	it("is wired to each platform's module", async () => {
		modules.AnotherToDoImages = { averageColor: async () => "#654321" };
		expect(await createMac().averageColor("u", BAND)).toBe("#654321");
		expect(await createAndroid().averageColor("u", BAND)).toBe("#123456");
		expect(await createIos().averageColor("u", BAND)).toBe("#123456");
	});
});

describe("PhotoTones", () => {
	it("judges a photo light or dark and remembers it per edge", async () => {
		const sampler = new FakeImageSampler();
		sampler.color = (band) => (band.from > 0.5 ? "#202020" : "#e0e0e0");
		const tones = new PhotoTones(sampler);
		expect(tones.cached("p", "top")).toBeNull();
		expect(await tones.toneOf("p", "first", "top")).toBe("light");
		expect(await tones.toneOf("p", "first", "bottom")).toBe("dark");
		expect(await tones.toneOf("p", "refreshed", "top")).toBe("light");
		expect(tones.cached("p", "bottom")).toBe("dark");
		expect(sampler.calls).toHaveLength(2);
	});

	it("tries again after an unreadable or failing photo", async () => {
		const sampler = new FakeImageSampler();
		const tones = new PhotoTones(sampler);
		expect(await tones.toneOf("p", "u", "top")).toBeNull();
		sampler.color = () => {
			throw new Error("offline");
		};
		expect(await tones.toneOf("p", "u", "top")).toBeNull();
		sampler.color = () => "#ffffff";
		expect(await tones.toneOf("p", "u", "top")).toBe("light");
	});
});
