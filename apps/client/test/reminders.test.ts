import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "react-native";
import { Task } from "../src/domain/task";
import { ReminderService, type TaskSource } from "../src/reminders/reminder-service";
import {
	DesktopReminderNotifier,
	type DesktopReminderModule,
} from "../src/reminders/desktop-reminder-notifier";
import {
	WebReminderNotifier,
	WindowNotifications,
	type BrowserNotifications,
} from "../src/reminders/web-reminder-notifier";
import { createReminderNotifier } from "../src/reminders/reminder-notifier-factory";
import { createReminderNotifier as createMacNotifier } from "../src/reminders/reminder-notifier-factory.macos";
import { createReminderNotifier as createWindowsNotifier } from "../src/reminders/reminder-notifier-factory.windows";
import { Observable } from "../src/state/observable";
import { FakeReminderNotifier, FixedClock } from "./support/fakes";

const expo = vi.hoisted(() => ({
	getPermissionsAsync: vi.fn(),
	requestPermissionsAsync: vi.fn(),
	scheduleNotificationAsync: vi.fn(async () => "id"),
	cancelScheduledNotificationAsync: vi.fn(async () => undefined),
	cancelAllScheduledNotificationsAsync: vi.fn(async () => undefined),
	setNotificationHandler: vi.fn(),
	setNotificationChannelAsync: vi.fn(async () => undefined),
	SchedulableTriggerInputTypes: { DATE: "date" },
	AndroidImportance: { HIGH: 4 },
}));
vi.mock("expo-notifications", () => expo);

import { ExpoReminderNotifier } from "../src/reminders/expo-reminder-notifier";

class Tasks extends Observable<{ tasks: Task[] }> implements TaskSource {
	constructor() {
		super({ tasks: [] });
	}

	replace(tasks: Task[]): void {
		this.set({ tasks });
	}
}

const FUTURE = new Date(2026, 10, 19, 18, 0, 0).toISOString();
const PAST = new Date(2026, 10, 19, 8, 0, 0).toISOString();

function task(id: string, remindAt: string | null, completed = false, title = `Task ${id}`): Task {
	return Task.create(id, title, "2026-11-01T00:00:00.000Z").with({ remindAt, completed });
}

describe("ReminderService", () => {
	function setup() {
		const notifier = new FakeReminderNotifier();
		const tasks = new Tasks();
		const service = new ReminderService(notifier, tasks, new FixedClock());
		return { notifier, tasks, service };
	}

	it("schedules upcoming reminders and skips past, completed and unset ones", async () => {
		const { notifier, tasks, service } = setup();
		tasks.replace([task("a", FUTURE), task("b", PAST), task("c", FUTURE, true), task("d", null)]);
		await service.start();
		expect([...notifier.scheduled.keys()]).toEqual(["a"]);
		expect(notifier.clears).toBe(1);
		expect(service.get()).toEqual({ available: true, permission: "undetermined" });
		service.stop();
	});

	it("follows changes: reschedules, retitles and cancels", async () => {
		const { notifier, tasks, service } = setup();
		await service.start();
		tasks.replace([task("a", FUTURE)]);
		await vi.waitFor(() => expect(notifier.scheduled.get("a")?.at.toISOString()).toBe(FUTURE));
		const later = new Date(2026, 10, 20, 9, 0, 0).toISOString();
		tasks.replace([task("a", later)]);
		await vi.waitFor(() => expect(notifier.scheduled.get("a")?.at.toISOString()).toBe(later));
		tasks.replace([task("a", later, false, "Renamed")]);
		await vi.waitFor(() => expect(notifier.scheduled.get("a")?.title).toBe("Renamed"));
		const before = notifier.scheduled.get("a");
		await service.sync();
		expect(notifier.scheduled.get("a")).toBe(before);
		tasks.replace([]);
		await vi.waitFor(() => expect(notifier.cancelled).toEqual(["a"]));
		service.stop();
		tasks.replace([task("z", FUTURE)]);
		await Promise.resolve();
		expect(notifier.scheduled.has("z")).toBe(false);
	});

	it("tries again after a scheduling failure", async () => {
		const { notifier, tasks, service } = setup();
		const schedule = notifier.schedule.bind(notifier);
		notifier.schedule = async () => {
			throw new Error("refused");
		};
		tasks.replace([task("a", FUTURE)]);
		await service.start();
		expect(notifier.scheduled.size).toBe(0);
		notifier.schedule = schedule;
		await service.sync();
		expect(notifier.scheduled.size).toBe(1);
		service.stop();
	});

	it("restarting clears what was scheduled before", async () => {
		const { notifier, tasks, service } = setup();
		tasks.replace([task("a", FUTURE)]);
		await service.start();
		await service.start();
		expect(notifier.clears).toBe(2);
		expect(notifier.scheduled.size).toBe(1);
		service.stop();
	});

	it("asks for permission once and remembers an answer", async () => {
		const { notifier, service } = setup();
		expect(await service.ensurePermission()).toBe("granted");
		expect(await service.ensurePermission()).toBe("granted");
		expect(notifier.requests).toBe(1);
		expect(service.get().permission).toBe("granted");
		const denied = setup();
		denied.notifier.grantOnRequest = "denied";
		expect(await denied.service.ensurePermission()).toBe("denied");
		expect(denied.service.get().permission).toBe("denied");
	});

	it("reports an unavailable notifier", () => {
		const service = new ReminderService(
			new DesktopReminderNotifier(undefined),
			new Tasks(),
			new FixedClock(),
		);
		expect(service.get().available).toBe(false);
	});
});

describe("DesktopReminderNotifier", () => {
	it("passes everything to the native module with the time in milliseconds", async () => {
		const calls: unknown[][] = [];
		const module: DesktopReminderModule = {
			permission: async () => "granted",
			requestPermission: async () => "denied",
			schedule: async (...args) => void calls.push(["schedule", ...args]),
			cancel: async (...args) => void calls.push(["cancel", ...args]),
			clear: async () => void calls.push(["clear"]),
		};
		const notifier = new DesktopReminderNotifier(module);
		expect(notifier.available).toBe(true);
		expect(await notifier.permission()).toBe("granted");
		expect(await notifier.requestPermission()).toBe("denied");
		await notifier.schedule("a", "Task", new Date(5000));
		await notifier.cancel("a");
		await notifier.clear();
		expect(calls).toEqual([["schedule", "a", "Task", 5000], ["cancel", "a"], ["clear"]]);
	});

	it("is unavailable and inert without the native module", async () => {
		for (const missing of [undefined, null]) {
			const notifier = new DesktopReminderNotifier(missing);
			expect(notifier.available).toBe(false);
			expect(await notifier.permission()).toBe("denied");
			expect(await notifier.requestPermission()).toBe("denied");
			await notifier.schedule("a", "A", new Date());
			await notifier.cancel("a");
			await notifier.clear();
		}
	});
});

describe("WebReminderNotifier", () => {
	class FakeBrowser implements BrowserNotifications {
		permission: "default" | "granted" | "denied" = "default";
		shown: { title: string; tag: string }[] = [];

		async requestPermission(): Promise<"default" | "granted" | "denied"> {
			this.permission = "granted";
			return this.permission;
		}

		show(title: string, tag: string): void {
			this.shown.push({ title, tag });
		}
	}

	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it("translates permissions and requests them", async () => {
		const browser = new FakeBrowser();
		const notifier = new WebReminderNotifier(browser);
		expect(notifier.available).toBe(true);
		expect(await notifier.permission()).toBe("undetermined");
		expect(await notifier.requestPermission()).toBe("granted");
		expect(await notifier.permission()).toBe("granted");
		browser.permission = "denied";
		expect(await notifier.permission()).toBe("denied");
	});

	it("is unavailable without the Notification API", async () => {
		const notifier = new WebReminderNotifier(null);
		expect(notifier.available).toBe(false);
		expect(await notifier.permission()).toBe("denied");
		expect(await notifier.requestPermission()).toBe("denied");
		await notifier.schedule("a", "A", new Date(Date.now() + 1000));
		await vi.advanceTimersByTimeAsync(60_000);
		expect(WebReminderNotifier.detect().available).toBe(typeof Notification !== "undefined");
	});

	it("shows a notification when a reminder falls due, once", async () => {
		const browser = new FakeBrowser();
		browser.permission = "granted";
		const notifier = new WebReminderNotifier(browser);
		await notifier.schedule("a", "Call mum", new Date(Date.now() + 20_000));
		await vi.advanceTimersByTimeAsync(15_000);
		expect(browser.shown).toEqual([]);
		await vi.advanceTimersByTimeAsync(15_000);
		expect(browser.shown).toEqual([{ title: "Call mum", tag: "a" }]);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(browser.shown).toHaveLength(1);
	});

	it("stays quiet without permission and stops when cancelled or cleared", async () => {
		const browser = new FakeBrowser();
		const notifier = new WebReminderNotifier(browser);
		await notifier.schedule("a", "A", new Date(Date.now() + 1000));
		await vi.advanceTimersByTimeAsync(15_000);
		expect(browser.shown).toEqual([]);
		browser.permission = "granted";
		await notifier.schedule("b", "B", new Date(Date.now() + 1000));
		await notifier.schedule("c", "C", new Date(Date.now() + 1000));
		await notifier.cancel("b");
		await notifier.clear();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(browser.shown).toEqual([]);
		await notifier.cancel("none");
	});

	it("reads the real Notification API through WindowNotifications", async () => {
		const shown: unknown[] = [];
		class StubNotification {
			static permission = "granted";
			static requestPermission = async () => "denied";
			constructor(title: string, options: unknown) {
				shown.push([title, options]);
			}
		}
		vi.stubGlobal("Notification", StubNotification);
		const real = new WindowNotifications();
		expect(real.permission).toBe("granted");
		expect(await real.requestPermission()).toBe("denied");
		real.show("Hi", "t");
		expect(shown).toEqual([["Hi", { tag: "t" }]]);
		expect(WebReminderNotifier.detect().available).toBe(true);
		vi.unstubAllGlobals();
	});
});

describe("ExpoReminderNotifier", () => {
	beforeEach(() => {
		for (const mock of Object.values(expo)) {
			if (typeof mock === "function" && "mockClear" in mock) {
				mock.mockClear();
			}
		}
	});
	afterEach(() => {
		Platform.OS = "web";
	});

	it("maps the permission state", async () => {
		const notifier = new ExpoReminderNotifier();
		expect(notifier.available).toBe(true);
		expo.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
		expect(await notifier.permission()).toBe("granted");
		expo.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
		expect(await notifier.permission()).toBe("undetermined");
		expo.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
		expect(await notifier.requestPermission()).toBe("denied");
	});

	it("schedules a dated notification and sets up the handler once", async () => {
		Platform.OS = "android";
		const notifier = new ExpoReminderNotifier();
		const at = new Date(2026, 10, 20, 9, 0, 0);
		await notifier.schedule("a", "Task", at);
		await notifier.schedule("b", "Other", at);
		expect(expo.scheduleNotificationAsync).toHaveBeenCalledWith({
			identifier: "a",
			content: { title: "Task", sound: true },
			trigger: { type: "date", date: at, channelId: "reminders" },
		});
		expect(expo.setNotificationHandler).toHaveBeenCalledTimes(1);
		expect(expo.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
		const handler = expo.setNotificationHandler.mock.calls[0]![0] as {
			handleNotification: () => Promise<unknown>;
		};
		expect(await handler.handleNotification()).toMatchObject({ shouldShowBanner: true });
	});

	it("skips the Android channel elsewhere, and cancels", async () => {
		Platform.OS = "ios";
		const notifier = new ExpoReminderNotifier();
		await notifier.requestPermission();
		expect(expo.setNotificationChannelAsync).not.toHaveBeenCalled();
		await notifier.cancel("a");
		await notifier.clear();
		expect(expo.cancelScheduledNotificationAsync).toHaveBeenCalledWith("a");
		expect(expo.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
	});
});

describe("createReminderNotifier", () => {
	afterEach(() => {
		Platform.OS = "web";
	});

	it("uses the browser on the web, Expo on mobile and nothing on desktop", () => {
		expect(createReminderNotifier()).toBeInstanceOf(WebReminderNotifier);
		Platform.OS = "ios";
		expect(createReminderNotifier()).toBeInstanceOf(ExpoReminderNotifier);
		expect(createMacNotifier()).toBeInstanceOf(DesktopReminderNotifier);
		expect(createWindowsNotifier()).toBeInstanceOf(DesktopReminderNotifier);
		expect(createMacNotifier().available).toBe(false);
	});
});
