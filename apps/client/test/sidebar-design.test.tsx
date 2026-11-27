import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ColorMath } from "../src/ui/color-math";
import { SidebarColors } from "../src/ui/sidebar-colors";
import { menuLook } from "../src/ui/menu-look";
import { sidebarActions } from "../src/ui/sidebar-actions";
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

describe("sidebarActions", () => {
	it.each([
		["macos", null, "logOut"],
		["windows", "settings", "signOut"],
		["web", "settings", "signOut"],
		["ios", "settings", "logOut"],
		["android", "settings", "logOut"],
	])("gives the %s app its header button and account action", (platform, header, account) => {
		expect(sidebarActions(platform).headerAction).toBe(header);
		expect(sidebarActions(platform).accountAction).toBe(account);
	});

	it("uses this platform when none is named", () => {
		expect(sidebarActions()).toBe(sidebarActions("web"));
	});
});

describe("menuLook", () => {
	const height = (style: "cozy" | "compact", platform: string) =>
		menuLook(style, platform).metrics.rowHeight;

	it("is denser when compact on pointer platforms than on touch", () => {
		expect(height("compact", "macos")).toBe(28);
		expect(height("compact", "windows")).toBe(28);
		expect(height("compact", "android")).toBe(44);
		expect(height("compact", "ios")).toBe(44);
		expect(menuLook("compact")).toBe(menuLook("compact", "web"));
	});

	it.each(["macos", "windows", "web", "ios", "android"])(
		"is equally roomy when cozy on %s",
		(platform) => {
			expect(menuLook("cozy", platform)).toBe(menuLook("cozy"));
			expect(menuLook("cozy", platform).metrics).toMatchObject({
				rowHeight: 44,
				fontSize: 14,
				iconSize: 20,
				paddingStart: 24,
				labelGap: 16,
			});
		},
	);

	it.each([
		["light", LIGHT, false],
		["dark", DARK, true],
	])("keeps cozy icons plain and compact icons colored in %s mode", (_, palette, dark) => {
		const icon = { viewId: "planned", theme: null, palette, dark };
		expect(menuLook("cozy").iconColor(icon)).toBe(palette.text);
		expect(menuLook("compact").iconColor(icon)).toBe(
			SidebarColors.icon("planned", null, palette.sidebar, dark),
		);
	});

	it.each([LIGHT, DARK])("keeps cozy text readable on a selected list", (palette) => {
		const surface = menuLook("cozy").surface(palette);
		expect(ColorMath.contrast(palette.text, surface.selected)).toBeGreaterThanOrEqual(4.5);
	});
});

describe("menu style", () => {
	async function start(options: Parameters<typeof renderApp>[0] = {}) {
		const app = await renderApp(options);
		stop = app.stop;
		return app;
	}

	const sidebar = () => within(screen.getByLabelText("Lists"));
	const row = (name: string) => sidebar().getByLabelText(name, { selector: "[role=button]" });
	const label = (name: string) => within(row(name)).getByText(name);

	it("is compact until changed", async () => {
		await start();
		expect(screen.queryByTestId("selection-marker")).toBeNull();
		expect(row("My Day").style.paddingLeft).toBe("16px");
		expect(screen.getByLabelText("Lists").style.backgroundColor).toBe("rgb(245, 245, 245)");
	});

	it("changes the whole sidebar at once", async () => {
		const app = await start({ platform: "web" });
		act(() => {
			app.container.store.addList("Errands");
			app.container.store.createGroupFor(app.container.store.get().lists[0]!.id, "Chores");
			app.container.store.addList("Garden");
			app.container.store.stopRenamingGroup();
			app.container.store.select("my-day");
			app.container.settings.change({ menuStyle: "cozy" });
		});
		expect(screen.getByLabelText("Lists").style.backgroundColor).toBe("rgb(255, 255, 255)");
		expect(row("My Day").style.paddingLeft).toBe("24px");
		expect(row("Errands").style.paddingLeft).toBe("44px");
		expect(label("My Day").style.marginLeft).toBe("16px");
		expect(sidebar().getByLabelText(/^Group /).style.paddingLeft).toBe("24px");
		expect(sidebar().getByLabelText("Create a new list").style.paddingLeft).toBe("18px");
		fireEvent.click(sidebar().getByLabelText("Create a new list"));
		expect(sidebar().getByLabelText("New List").style.marginLeft).toBe("16px");
	});

	it("marks only the selected list", async () => {
		const app = await start();
		act(() => app.container.settings.change({ menuStyle: "cozy" }));
		const marked = () => screen.getByTestId("selection-marker").parentElement;
		expect(marked()).toBe(row("My Day"));
		fireEvent.click(row("Tasks"));
		expect(marked()).toBe(row("Tasks"));
	});

	it("starts from the server's default", async () => {
		await start({ config: { defaultSettings: { menuStyle: "cozy" } } });
		expect(screen.getByTestId("selection-marker")).toBeTruthy();
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
