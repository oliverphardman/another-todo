import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(__dirname, "..", path), "utf8");

describe("macOS sign-in redirect", () => {
	it("hands links opened with the app to React Native", () => {
		const delegate = source("macos/AnotherToDo-macOS/AppDelegate.swift");
		expect(delegate).toMatch(
			/func applicationDidFinishLaunching[\s\S]*setEventHandler\(\s*RCTLinkingManager\.self,\s*andSelector: NSSelectorFromString\("getUrlEventHandler:withReplyEvent:"\)/,
		);
		expect(delegate).toContain("andEventID: AEEventID(kAEGetURL)");
	});
});

describe("Windows sign-in redirect", () => {
	const app = source("windows/AnotherToDo/AnotherToDo.cpp");
	const links = source("windows/AnotherToDo/DeepLinks.h");

	it("hands a link from a second copy to the running app before starting React Native", () => {
		const redirect = app.indexOf("AnotherToDoLinks::Redirect(mainInstance, activation);");
		expect(app).toContain('FindOrRegisterForKey(L"main")');
		expect(redirect).toBeGreaterThan(-1);
		expect(redirect).toBeLessThan(app.indexOf("ReactNativeAppBuilder().Build()"));
		expect(app).toContain("links->Receive(args)");
		expect(app).toContain("links->Connect(args.Context())");
	});

	it("emits the event React Native's Linking listens for", () => {
		expect(links).toMatch(/EmitJSEvent\(\s*L"RCTDeviceEventEmitter", L"url"/);
	});

	it("registers the scheme the app redirects to when it is not installed as a package", () => {
		const scheme = /"scheme": "([a-z]+)"/.exec(source("app.json"))![1]!;
		expect(app).toContain("AnotherToDoLinks::RegisterScheme();");
		expect(links).toMatch(
			new RegExp(`IsUnpackaged\\(\\)[\\s\\S]*RegisterForProtocolActivation\\(\\s*L"${scheme}"`),
		);
		expect(source("windows/AnotherToDo.Package/Package.appxmanifest")).toContain(
			`<uap:Protocol Name="${scheme}">`,
		);
	});
});
