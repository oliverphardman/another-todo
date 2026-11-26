import { cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorMath } from "../src/ui/color-math";
import { SidebarColors } from "../src/ui/sidebar-colors";
import { sidebarMetrics } from "../src/ui/sidebar-metrics";
import { DARK, LIGHT } from "../src/ui/theme";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function signedInAs(profile: { name: string | null; email: string | null }) {
	const app = await renderApp({ signedIn: false, restore: false });
	app.authorizationServer.authorizeResult = {
		accessToken: "a",
		refreshToken: "r",
		expiresAt: Date.now() + 3_600_000,
		profile,
	};
	await app.container.auth.signIn();
	stop = app.stop;
	return within(await screen.findByLabelText("Lists"));
}

describe("sidebar account header", () => {
	it("shows who is signed in", async () => {
		const sidebar = await signedInAs({ name: "Ada Lovelace", email: "ada@x.test" });
		expect(sidebar.getByText("Ada Lovelace")).toBeTruthy();
		expect(sidebar.getByText("ada@x.test")).toBeTruthy();
		expect(sidebar.getByText("AL")).toBeTruthy();
		expect(sidebar.queryByText("Another To Do")).toBeNull();
	});

	it("shows the email once when there is no name", async () => {
		const sidebar = await signedInAs({ name: null, email: "ada@x.test" });
		expect(sidebar.getAllByText("ada@x.test")).toHaveLength(1);
	});

	it("shows a name without an email", async () => {
		const sidebar = await signedInAs({ name: "admin", email: null });
		expect(sidebar.getByText("admin")).toBeTruthy();
	});

	it("falls back to the app name when the server says nothing about the user", async () => {
		const app = await renderApp();
		stop = app.stop;
		expect(within(screen.getByLabelText("Lists")).getByText("Another To Do")).toBeTruthy();
	});
});

describe("SidebarColors", () => {
	const icon = (view: string, color: string | null, dark = true) =>
		SidebarColors.icon(
			view,
			color === null ? null : { type: "color", color },
			dark ? DARK.sidebar : LIGHT.sidebar,
			dark,
		);

	it("follows a list's chosen theme color", () => {
		expect(icon("list-1", "#c0392b")).not.toBe(icon("list-1", null));
		expect(icon("planned", "#c0392b")).toBe(icon("list-1", "#c0392b"));
	});

	it("gives each smart view its own color and photo themes the default", () => {
		const colors = ["my-day", "important", "planned", "all", "tasks"].map((id) => icon(id, null));
		expect(new Set(colors).size).toBe(5);
		expect(SidebarColors.icon("list-1", { type: "photo", photoId: "p" }, DARK.sidebar, true)).toBe(
			icon("list-1", null),
		);
	});

	it("stays visible on both sidebars", () => {
		for (const dark of [true, false]) {
			for (const color of ["#f9e7de", "#d5f1ee", "#1b1b1b", "#2564cf"]) {
				expect(
					ColorMath.contrast(icon("x", color, dark), dark ? DARK.sidebar : LIGHT.sidebar),
				).toBeGreaterThanOrEqual(3);
			}
		}
	});
});

describe("sidebarMetrics", () => {
	it.each([
		["macos", null, "logOut"],
		["windows", "settings", "signOut"],
		["web", "settings", "signOut"],
		["ios", "settings", "logOut"],
		["android", "settings", "logOut"],
	])("gives the %s app its header button and account action", (platform, header, account) => {
		expect(sidebarMetrics(platform).headerAction).toBe(header);
		expect(sidebarMetrics(platform).accountAction).toBe(account);
	});

	it("is denser for pointer platforms than for touch", () => {
		expect(sidebarMetrics("macos").rowHeight).toBe(28);
		expect(sidebarMetrics("windows").rowHeight).toBe(28);
		expect(sidebarMetrics("android").rowHeight).toBe(44);
		expect(sidebarMetrics()).toBe(sidebarMetrics("web"));
		expect(sidebarMetrics("ios").rowHeight).toBe(44);
	});
});

describe("sidebar edge", () => {
	it.each([
		["dark", "rgb(56, 56, 56)"],
		["light", "rgba(0, 0, 0, 0)"],
	] as const)("is a one point line in %s mode", async (scheme, color) => {
		const app = await renderApp({ scheme });
		stop = app.stop;
		const sidebar = screen.getByLabelText("Lists");
		expect(sidebar.style.borderRightWidth).toBe("1px");
		expect(sidebar.style.borderRightColor).toBe(color);
	});
});
