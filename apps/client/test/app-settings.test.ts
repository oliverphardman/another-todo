import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { MyDayView } from "../src/domain/task-view";
import { TaskSorter } from "../src/domain/task-sorter";
import { AppSettings, DEFAULT_SETTINGS } from "../src/state/app-settings";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { rowMetrics } from "../src/ui/row-metrics";

async function loaded(stored: string | null) {
	const storage = new MemoryKeyValueStore();
	if (stored !== null) {
		await storage.set("atd.settings", stored);
	}
	const settings = new AppSettings(storage);
	await settings.load();
	return { settings, storage };
}

describe("AppSettings", () => {
	it("starts cozy, adding at the top, with every list and due tasks in My Day", async () => {
		const { settings } = await loaded(null);
		expect(settings.get()).toEqual({
			rowStyle: "cozy",
			addTaskPosition: "top",
			microsoft: { receive: true, send: true, intervalMinutes: 2 },
			lists: { all: true, important: true, planned: true, completed: true },
			myDay: { yesterday: false, dueToday: true },
		});
	});

	it("remembers every change on this device", async () => {
		const { settings, storage } = await loaded(null);
		settings.change({ rowStyle: "compact", addTaskPosition: "bottom" });
		settings.changeMicrosoft({ send: false, intervalMinutes: 15 });
		settings.changeMyDay({ yesterday: true, dueToday: false });
		settings.showList("planned", false);
		const again = new AppSettings(storage);
		await again.load();
		expect(again.get()).toEqual(settings.get());
		expect(again.get().lists.planned).toBe(false);
		expect(again.get().microsoft).toEqual({ receive: true, send: false, intervalMinutes: 15 });
	});

	it.each(["not json", "null", "7", '{"lists":null,"microsoft":"x"}'])(
		"falls back to the defaults for %s",
		async (stored) => {
			expect((await loaded(stored)).settings.get()).toEqual(DEFAULT_SETTINGS);
		},
	);

	it("ignores values of the wrong type and clamps the interval", async () => {
		const { settings } = await loaded(
			JSON.stringify({
				rowStyle: "huge",
				addTaskPosition: 3,
				microsoft: { receive: "no", intervalMinutes: 100000 },
				lists: { all: false, completed: "no" },
			}),
		);
		expect(settings.get().rowStyle).toBe("cozy");
		expect(settings.get().microsoft).toEqual({ receive: true, send: true, intervalMinutes: 1440 });
		expect(settings.get().lists).toEqual({ ...DEFAULT_SETTINGS.lists, all: false });
		expect(AppSettings.minutes(0)).toBe(1);
		expect(AppSettings.minutes(2.6)).toBe(3);
	});
});

describe("My Day preferences", () => {
	const today = "2026-11-19";
	const task = (changes: Parameters<Task["with"]>[0]) => Task.create("t", "T", "x").with(changes);
	const view = new MyDayView({ yesterday: true, dueToday: true });

	it("carries over only unfinished tasks added yesterday that are not already in today's", () => {
		expect(view.carriesOver(task({ myDay: "2026-11-18" }), today)).toBe(true);
		expect(view.carriesOver(task({ myDay: "2026-11-17" }), today)).toBe(false);
		expect(view.carriesOver(task({ myDay: "2026-11-18", completed: true }), today)).toBe(false);
		expect(
			view.carriesOver(task({ myDay: "2026-11-18", dueDate: `${today}T00:00:00.000Z` }), today),
		).toBe(false);
		expect(new MyDayView().carriesOver(task({ myDay: "2026-11-18" }), today)).toBe(false);
	});

	it("leaves due tasks out of My Day and its sort order when asked to", () => {
		const due = task({ dueDate: `${today}T00:00:00.000Z` });
		const strict = new MyDayView({ yesterday: false, dueToday: false });
		expect(view.matches(due, today)).toBe(true);
		expect(strict.matches(due, today)).toBe(false);
		const plain = new Task({ ...due.data, id: "p", dueDate: null, createdAt: "z" });
		expect(
			[plain, due].sort(TaskSorter.comparator("myDay", "newest", today)).map((entry) => entry.id),
		).toEqual(["t", "p"]);
		expect(
			[due, plain]
				.sort(TaskSorter.comparator("myDay", "newest", today, false, false))
				.map((entry) => entry.id),
		).toEqual(["p", "t"]);
	});
});

describe("rowMetrics", () => {
	it("makes compact rows shorter", () => {
		expect(rowMetrics("cozy").height).toBe(52);
		expect(rowMetrics("compact").height).toBe(36);
		expect(rowMetrics("compact").pitch).toBeLessThan(rowMetrics("cozy").pitch);
	});
});
