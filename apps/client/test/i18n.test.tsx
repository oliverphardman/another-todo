import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const localization = vi.hoisted(() => ({ getLocales: vi.fn() }));
vi.mock("expo-localization", () => localization);

import { DeviceLocale } from "../src/i18n/device-locale";
import { EN_GB } from "../src/i18n/en-gb";
import { EN_US } from "../src/i18n/en-us";
import { I18n } from "../src/i18n/i18n";
import { I18nProvider, useI18n } from "../src/i18n/i18n-context";
import { CATALOGS, DEFAULT_LOCALE, LocaleResolver } from "../src/i18n/locales";

const NOW = new Date(2026, 10, 19, 12, 0, 0);
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MINUTE = 60_000;
const HOUR = 3_600_000;

describe("LocaleResolver", () => {
	it("defaults to en-US", () => {
		expect(DEFAULT_LOCALE).toBe("en-US");
		expect(LocaleResolver.resolve([])).toBe("en-US");
		expect(LocaleResolver.resolve(["fr-FR", "de-DE"])).toBe("en-US");
	});

	it("matches supported locales regardless of case or separator", () => {
		expect(LocaleResolver.resolve(["en-GB"])).toBe("en-GB");
		expect(LocaleResolver.resolve(["EN-gb"])).toBe("en-GB");
		expect(LocaleResolver.resolve(["en_GB"])).toBe("en-GB");
		expect(LocaleResolver.resolve(["en-US"])).toBe("en-US");
	});

	it("maps other British-style English variants to en-GB and other English to the first English catalog", () => {
		for (const tag of ["en-AU", "en-NZ", "en-IE", "en-IN", "en-ZA"]) {
			expect(LocaleResolver.resolve([tag])).toBe("en-GB");
		}
		expect(LocaleResolver.resolve(["en"])).toBe("en-US");
		expect(LocaleResolver.resolve(["en-CA"])).toBe("en-US");
	});

	it("uses the first supported preference in order", () => {
		expect(LocaleResolver.resolve(["fr-FR", "en-GB", "en-US"])).toBe("en-GB");
	});

	it("only offers catalogs with every message", () => {
		for (const messages of Object.values(CATALOGS)) {
			expect(Object.keys(messages).sort()).toEqual(Object.keys(EN_US).sort());
		}
		expect(EN_GB["theme.colors"]).toBe("Colours");
	});
});

describe("DeviceLocale", () => {
	beforeEach(() => localization.getLocales.mockReset());

	it("resolves the system's preferences to a supported locale", () => {
		localization.getLocales.mockReturnValue([{ languageTag: "fr-FR" }, { languageTag: "en-AU" }]);
		expect(DeviceLocale.resolved()).toBe("en-GB");
		localization.getLocales.mockReturnValue([{ languageTag: "ja-JP" }]);
		expect(DeviceLocale.resolved()).toBe("en-US");
		localization.getLocales.mockReturnValue([]);
		expect(DeviceLocale.resolved()).toBe("en-US");
	});

	it("lists the system's preferred language tags", () => {
		localization.getLocales.mockReturnValue([{ languageTag: "en-GB" }, { languageTag: "fr-FR" }]);
		expect(DeviceLocale.preferred()).toEqual(["en-GB", "fr-FR"]);
	});
});

describe("I18n", () => {
	it("interpolates parameters and keeps unknown placeholders visible", () => {
		const i18n = new I18n();
		expect(i18n.t("task.open", { title: "Milk" })).toBe("Open Milk");
		expect(i18n.t("task.stepsProgress", { done: 1, total: 3 })).toBe("1 of 3");
		expect(i18n.t("task.open")).toBe("Open {title}");
		expect(i18n.t("app.name")).toBe("Another To Do");
	});

	it("chooses plural forms", () => {
		const i18n = new I18n();
		expect(i18n.count("sync.rejected", 1)).toBe("1 change couldn't be saved and was undone.");
		expect(i18n.count("sync.rejected", 3)).toBe("3 changes couldn't be saved and were undone.");
		expect(i18n.count("sync.rejected", 0)).toBe("0 changes couldn't be saved and were undone.");
	});

	it("translates view titles, localized errors and short days", () => {
		const i18n = new I18n("en-GB");
		expect(i18n.viewTitle({ title: "My Day", titleKey: "view.myDay" })).toBe("My Day");
		expect(i18n.viewTitle({ title: "Groceries", titleKey: null })).toBe("Groceries");
		expect(i18n.text({ key: "photo.errorSize", params: { size: 5 } })).toBe(
			"Photos must be 5 MB or smaller.",
		);
		expect(i18n.text({ message: "From the server" })).toBe("From the server");
		expect(i18n.shortDay("2026-11-27")).toBe("Fri 27 Nov");
	});

	it("falls back to the en-US catalog for unknown locales", () => {
		expect(new I18n("fr-FR").t("view.myDay")).toBe("My Day");
		expect(new I18n("fr-FR").locale).toBe("en-US");
		expect(new I18n("fr-FR").longDay("2026-11-19")).toBe("Thursday, November 19");
	});

	it("formats due labels for the locale", () => {
		const us = new I18n("en-US");
		expect(us.dueLabel("2026-11-19", "2026-11-19")).toBe("Today");
		expect(us.dueLabel("2026-11-20", "2026-11-19")).toBe("Tomorrow");
		expect(us.dueLabel("2026-11-18", "2026-11-19")).toBe("Yesterday");
		expect(us.dueLabel("2026-11-27", "2026-11-19")).toBe("Fri, Nov 27");
		expect(us.dueLabel("2027-01-04", "2026-11-19")).toBe("Mon, Jan 4, 2027");
		const gb = new I18n("en-GB");
		expect(gb.dueLabel("2026-11-27", "2026-11-19")).toBe("Fri 27 Nov");
		expect(gb.dueLabel("2027-01-04", "2026-11-19")).toBe("Mon, 4 Jan 2027");
	});

	it("writes the long day the way each locale does", () => {
		expect(new I18n("en-US").longDay("2026-11-19")).toBe("Thursday, November 19");
		expect(new I18n("en-GB").longDay("2026-11-19")).toBe("Thursday 19 November");
	});

	it("describes when something was created, capitalizing only the word Created", () => {
		const i18n = new I18n();
		expect(i18n.createdLabel(ago(5_000), NOW)).toBe("Created a few moments ago");
		expect(i18n.createdLabel(ago(MINUTE), NOW)).toBe("Created 1 minute ago");
		expect(i18n.createdLabel(ago(12 * MINUTE), NOW)).toBe("Created 12 minutes ago");
		expect(i18n.createdLabel(ago(HOUR), NOW)).toBe("Created 1 hour ago");
		expect(i18n.createdLabel(ago(5 * HOUR), NOW)).toBe("Created 5 hours ago");
		expect(i18n.createdLabel(ago(23 * HOUR), NOW)).toBe("Created 23 hours ago");
		expect(i18n.createdLabel(ago(30 * HOUR), NOW)).toBe("Created yesterday");
		expect(i18n.createdLabel(ago(5 * 24 * HOUR), NOW)).toBe("Created Sat, Nov 14");
		expect(i18n.createdLabel(ago(400 * 24 * HOUR), NOW)).toBe("Created Wed, Oct 15, 2025");
	});
});

describe("I18nProvider", () => {
	function Probe() {
		const i18n = useI18n();
		return <p>{`${i18n.locale}: ${i18n.t("theme.colors")}`}</p>;
	}

	it("defaults to en-US and switches locale", () => {
		const first = render(<Probe />);
		expect(screen.getByText("en-US: Colors")).toBeTruthy();
		first.unmount();
		render(
			<I18nProvider locale="en-GB">
				<Probe />
			</I18nProvider>,
		);
		expect(screen.getByText("en-GB: Colours")).toBeTruthy();
	});

	it("uses the default locale when none is given", () => {
		render(
			<I18nProvider>
				<Probe />
			</I18nProvider>,
		);
		expect(screen.getByText("en-US: Colors")).toBeTruthy();
	});
});
