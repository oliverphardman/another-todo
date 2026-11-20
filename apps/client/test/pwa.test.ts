import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("progressive web app metadata", () => {
	const manifest = JSON.parse(read("public/manifest.json")) as {
		name: string;
		short_name: string;
		start_url: string;
		display: string;
		theme_color: string;
		background_color: string;
		icons: { src: string; sizes: string; purpose: string }[];
	};

	it("describes an installable app with every icon file present", () => {
		expect(manifest.name).toBe("Another To Do");
		expect(manifest.short_name.length).toBeLessThanOrEqual(12);
		expect(manifest.start_url).toBe("/");
		expect(manifest.display).toBe("standalone");
		expect(manifest.theme_color).toBe("#2564cf");
		expect(manifest.background_color).toBe("#1e1e1e");
		expect(manifest.icons.map((icon) => icon.purpose)).toContain("maskable");
		expect(manifest.icons.some((icon) => icon.sizes === "512x512")).toBe(true);
		expect(manifest.icons.some((icon) => icon.sizes === "192x192")).toBe(true);
		for (const icon of manifest.icons) {
			expect(existsSync(join(root, "public", icon.src))).toBe(true);
		}
	});

	it("links the manifest, icons, social cards and theme colors from the page", () => {
		const html = read("public/index.html");
		for (const fragment of [
			'<html lang="en">',
			'rel="manifest" href="/manifest.json"',
			'rel="apple-touch-icon"',
			'name="description"',
			'name="theme-color"',
			'property="og:title"',
			'property="og:description"',
			'property="og:image" content="https://itsanotherdemo.app/og.png"',
			'name="twitter:card" content="summary_large_image"',
			'rel="canonical"',
		]) {
			expect(html).toContain(fragment);
		}
		expect(existsSync(join(root, "public", "og.png"))).toBe(true);
		expect(existsSync(join(root, "public", "apple-touch-icon.png"))).toBe(true);
		expect(read("public/robots.txt")).toContain("Allow: /");
	});
});
