import { describe, expect, it } from "vitest";
import { DefaultSettings } from "../src/application/default-settings";
import { startLocalApp } from "./support/local-app";

const everything = {
	rowStyle: "compact",
	addTaskPosition: "bottom",
	microsoft: { receive: false, send: true, intervalMinutes: 1440 },
	lists: { all: false, important: false, planned: true, completed: true },
	myDay: { yesterday: true, dueToday: false },
};

describe("DefaultSettings", () => {
	it("is empty unless set, and takes all or part of the settings", () => {
		expect(DefaultSettings.parse(null)).toEqual({});
		expect(DefaultSettings.parse(JSON.stringify(everything))).toEqual(everything);
		expect(DefaultSettings.parse('{"lists":{"all":false}}')).toEqual({ lists: { all: false } });
	});

	it.each([
		["not json", "DEFAULT_SETTINGS must be a JSON object"],
		["[]", "DEFAULT_SETTINGS must be a JSON object"],
		["null", "DEFAULT_SETTINGS must be a JSON object"],
		['{"lists":true}', "DEFAULT_SETTINGS.lists must be a JSON object"],
		['{"theme":"dark"}', "DEFAULT_SETTINGS.theme is not a setting"],
		['{"constructor":1}', "DEFAULT_SETTINGS.constructor is not a setting"],
		['{"rowStyle":"huge"}', "DEFAULT_SETTINGS.rowStyle must be cozy or compact"],
		['{"myDay":{"yesterday":"no"}}', "DEFAULT_SETTINGS.myDay.yesterday must be true or false"],
		[
			'{"microsoft":{"intervalMinutes":0}}',
			"DEFAULT_SETTINGS.microsoft.intervalMinutes must be a whole number from 1 to 1440",
		],
		['{"microsoft":{"intervalMinutes":1.5}}', "a whole number"],
		['{"microsoft":{"intervalMinutes":1441}}', "a whole number"],
	])("rejects %s", (json, message) => {
		expect(() => DefaultSettings.parse(json)).toThrow(message);
	});

	it("is announced to apps", async () => {
		const app = await startLocalApp({ DEFAULT_SETTINGS: JSON.stringify(everything) });
		const config = (await (await fetch(`${app.base}/config`)).json()) as Record<string, unknown>;
		expect(config.defaultSettings).toEqual(everything);
	});
});
