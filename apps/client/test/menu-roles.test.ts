import { Platform } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { menuItemRole } from "../src/ui/menu";

const original = Platform.OS;
const ANDROID_ROLES = ["menuitem", "radio"];

afterEach(() => {
	Platform.OS = original;
});

describe("menu item roles", () => {
	it.each(["android", "ios", "macos", "windows"])(
		"only uses roles %s accepts, because an unknown one crashes the app",
		(platform) => {
			Platform.OS = platform as typeof Platform.OS;
			expect([menuItemRole(false), menuItemRole(true)]).toEqual(ANDROID_ROLES);
		},
	);

	it("keeps the checkable menu item role on the web", () => {
		Platform.OS = "web";
		expect(menuItemRole(true)).toBe("menuitemradio");
	});
});
