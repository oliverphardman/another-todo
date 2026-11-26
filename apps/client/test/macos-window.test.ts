import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const delegate = readFileSync(resolve("macos/AnotherToDo-macOS/AppDelegate.swift"), "utf8");

describe("macOS window", () => {
	it("backs the root view with the system window color so the title bar follows dark mode", () => {
		expect(delegate).toContain(
			"(view as? RCTSurfaceHostingProxyRootView)?.backgroundColor = .windowBackgroundColor",
		);
	});
});
