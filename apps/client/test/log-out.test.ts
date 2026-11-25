import { describe, expect, it, vi } from "vitest";
import { AppConfigReader } from "../src/config/app-config";
import { ServerInfoLoader } from "../src/config/server-info";
import { ServerSessions } from "../src/config/server-session";
import { Task } from "../src/domain/task";
import { ReminderService } from "../src/reminders/reminder-service";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { Observable } from "../src/state/observable";
import { FakeReminderNotifier, FixedClock } from "./support/fakes";

const answer = new ServerInfoLoader(
	async () => new Response(JSON.stringify({ authentication: "none" }), { status: 200 }),
);

describe("logging out", () => {
	it("forgets the server, its data and tokens, and asks for an address again", async () => {
		const data = new MemoryKeyValueStore();
		const tokens = new MemoryKeyValueStore();
		const session = ServerSessions.create(
			AppConfigReader.read({}, undefined, undefined),
			data,
			tokens,
			answer,
		);
		await session.connect("todo.example.com");
		await data.set("atd.snapshot", "tasks");
		await tokens.set("atd.tokens", "secret");
		await session.logOut();
		expect(session.get()).toEqual({ status: "needsUrl", invalid: false });
		expect(await data.get("atd.serverUrl")).toBeNull();
		expect(await data.get("atd.snapshot")).toBeNull();
		expect(await tokens.get("atd.tokens")).toBeNull();
		await data.set("atd.snapshot", "written late by the old session");
		await session.connect("todo.example.com");
		expect(await data.get("atd.snapshot")).toBeNull();
	});

	it("cancels every scheduled reminder", async () => {
		class Tasks extends Observable<{ tasks: Task[] }> {}
		const notifier = new FakeReminderNotifier();
		const task = Task.create("a", "A", "2026-11-01T00:00:00.000Z").with({
			remindAt: "2027-01-01T00:00:00.000Z",
		});
		const service = new ReminderService(notifier, new Tasks({ tasks: [task] }), new FixedClock());
		vi.useFakeTimers();
		await service.start();
		await service.reset();
		expect(notifier.clears).toBe(2);
		expect(vi.getTimerCount()).toBe(0);
		await service.sync();
		expect(notifier.scheduled.has("a")).toBe(true);
		vi.useRealTimers();
	});
});
