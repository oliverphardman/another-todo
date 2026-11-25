import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("the app name", () => {
	it("is spaced out for Expo, which names the Android, iOS and web apps", () => {
		const { expo } = JSON.parse(read("app.json")) as {
			expo: { name: string; web: { name: string; shortName: string } };
		};
		expect([expo.name, expo.web.name, expo.web.shortName]).toEqual(Array(3).fill("Another To Do"));
		expect(read("public/index.html")).toContain(
			'name="apple-mobile-web-app-title" content="Another To Do"',
		);
	});

	it("names the macOS bundle and its window", () => {
		const project = read("macos/AnotherToDo.xcodeproj/project.pbxproj");
		expect(project.match(/PRODUCT_NAME = "Another To Do";/g)).toHaveLength(4);
		expect(project).not.toContain("AnotherToDo.app");
		expect(
			read("macos/AnotherToDo.xcodeproj/xcshareddata/xcschemes/AnotherToDo-macOS.xcscheme"),
		).not.toContain("AnotherToDo.app");
		expect(read("macos/AnotherToDo-macOS/Info.plist")).toMatch(
			/<key>CFBundleDisplayName<\/key>\s*<string>Another To Do<\/string>/,
		);
		expect(read("macos/AnotherToDo-macOS/AppDelegate.swift")).toContain('Window("Another To Do"');
	});

	it("names the Windows package and window", () => {
		const manifest = read("windows/AnotherToDo.Package/Package.appxmanifest");
		expect(manifest).not.toMatch(/DisplayName>AnotherToDo<|DisplayName="AnotherToDo"/);
		expect(manifest).toContain("<DisplayName>Another To Do</DisplayName>");
		expect(manifest).toContain('DisplayName="Another To Do"');
		expect(read("windows/AnotherToDo/AnotherToDo.cpp")).toContain('Title(L"Another To Do")');
	});
});
