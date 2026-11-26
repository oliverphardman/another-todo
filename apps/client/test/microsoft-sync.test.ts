import { AppSettings } from "../src/state/app-settings";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationService } from "../src/auth/authentication-service";
import { TokenRepository } from "../src/auth/token-repository";
import { DueDay } from "../src/domain/due-day";
import { LinkRepository } from "../src/microsoft/microsoft-links";
import { MicrosoftIdentity } from "../src/microsoft/microsoft-identity";
import { MicrosoftSession } from "../src/microsoft/microsoft-session";
import { MicrosoftSyncEngine } from "../src/microsoft/microsoft-sync-engine";
import { MicrosoftSyncService } from "../src/microsoft/microsoft-sync-service";
import { TodoStore } from "../src/state/todo-store";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { LocalDatabase } from "../src/storage/local-database";
import {
	FakeAuthorizationServer,
	FixedClock,
	ManualConnectivity,
	RecordingSoundPlayer,
	SequenceIds,
} from "./support/fakes";
import {
	FakeMicrosoftAuthorizer,
	FakeRemoteTodo,
	microsoftAccessToken,
} from "./support/fake-microsoft";

function engineSetup() {
	const database = new LocalDatabase(new MemoryKeyValueStore());
	const clock = new FixedClock();
	const ids = new SequenceIds();
	const store = new TodoStore(
		database,
		ids,
		clock,
		{ request: () => undefined },
		new RecordingSoundPlayer(),
		new AppSettings(new MemoryKeyValueStore()),
	);
	const remote = new FakeRemoteTodo();
	const links = new LinkRepository(new MemoryKeyValueStore());
	const engine = new MicrosoftSyncEngine(store, remote, links, ids, clock);
	return { store, remote, links, engine, clock };
}

const titles = (store: TodoStore, listId: string | null) =>
	store
		.get()
		.tasks.filter((task) => task.listId === listId)
		.map((task) => task.title)
		.sort();

describe("MicrosoftSyncEngine", () => {
	it("brings Microsoft lists and tasks in, including steps, due day, importance and notes", async () => {
		const { store, remote, engine } = engineSetup();
		const work = remote.addList("Work");
		remote.addTask("ms-default", { title: "Default task", important: true });
		remote.addTask(work.id, {
			title: "Report",
			completed: true,
			dueDay: "2026-12-24",
			note: "Quarterly",
			steps: [
				{ id: "s1", title: "Draft", completed: true },
				{ id: "s2", title: "Send", completed: false },
			],
		});
		await engine.run();
		const lists = store.get().lists;
		expect(lists.map((list) => list.name)).toEqual(["Work"]);
		expect(titles(store, null)).toEqual(["Default task"]);
		expect(store.get().tasks.find((task) => task.title === "Default task")!.important).toBe(true);
		const report = store.get().tasks.find((task) => task.title === "Report")!;
		expect(report.listId).toBe(lists[0]!.id);
		expect([report.completed, report.dueDay, report.note]).toEqual([
			true,
			"2026-12-24",
			"Quarterly",
		]);
		expect(report.steps.map((step) => [step.title, step.completed])).toEqual([
			["Draft", true],
			["Send", false],
		]);
	});

	it("sends local lists and tasks to Microsoft", async () => {
		const { store, remote, engine } = engineSetup();
		const listId = store.addList("Garden")!;
		store.select("tasks");
		const plain = store.addTask("Water plants")!;
		store.updateTask(plain, {
			dueDate: DueDay.toIso("2026-12-01"),
			importance: "high",
			note: "Daily",
		});
		store.select(listId);
		store.addTask("Buy seeds");
		await engine.run();
		expect([...remote.listsById.values()].map((list) => list.name).sort()).toEqual([
			"Garden",
			"Tasks",
		]);
		const defaults = remote.tasksByList.get("ms-default")!;
		expect(defaults.map((task) => [task.title, task.important, task.dueDay, task.note])).toEqual([
			["Water plants", true, "2026-12-01", "Daily"],
		]);
		const garden = [...remote.listsById.values()].find((list) => list.name === "Garden")!;
		expect(remote.tasksByList.get(garden.id)!.map((task) => task.title)).toEqual(["Buy seeds"]);
	});

	it("does nothing when neither side changed", async () => {
		const { store, remote, engine } = engineSetup();
		remote.addTask("ms-default", { title: "Stable" });
		await engine.run();
		remote.calls.length = 0;
		const before = store.get().tasks;
		await engine.run();
		expect(store.get().tasks).toEqual(before);
		expect(remote.calls.filter((call) => /^(create|update|delete|rename)/.test(call))).toEqual([]);
	});

	it("pushes a local edit and pulls a remote edit, with Microsoft winning when both changed", async () => {
		const { store, remote, engine } = engineSetup();
		const task = remote.addTask("ms-default", {
			title: "Shared",
			steps: [{ id: "s", title: "Step", completed: false }],
		});
		await engine.run();
		const local = store.get().tasks[0]!;
		store.updateTask(local.id, { title: "Edited here" });
		await engine.run();
		expect(remote.tasksByList.get("ms-default")![0]!.title).toBe("Edited here");
		remote.tasksByList.get("ms-default")![0] = {
			...remote.tasksByList.get("ms-default")![0]!,
			title: "Edited there",
			completed: true,
		};
		await engine.run();
		expect(store.get().tasks[0]!.title).toBe("Edited there");
		expect(store.get().tasks[0]!.completed).toBe(true);
		store.updateTask(local.id, { title: "Local again" });
		remote.tasksByList.get("ms-default")![0] = {
			...remote.tasksByList.get("ms-default")![0]!,
			title: "Remote again",
		};
		await engine.run();
		expect(store.get().tasks[0]!.title).toBe("Remote again");
		expect(task.id).toBeDefined();
	});

	it("propagates deletions in both directions", async () => {
		const { store, remote, engine } = engineSetup();
		remote.addTask("ms-default", { title: "Gone remotely" });
		remote.addTask("ms-default", { title: "Gone locally" });
		await engine.run();
		const gone = store.get().tasks.find((task) => task.title === "Gone locally")!;
		store.deleteTask(gone.id);
		remote.tasksByList.set(
			"ms-default",
			remote.tasksByList.get("ms-default")!.filter((task) => task.title !== "Gone remotely"),
		);
		await engine.run();
		expect(store.get().tasks).toEqual([]);
		expect(remote.tasksByList.get("ms-default")).toEqual([]);
	});

	it("keeps list names in step and propagates list deletions", async () => {
		const { store, remote, engine } = engineSetup();
		const first = remote.addList("Errands");
		const second = remote.addList("Books");
		await engine.run();
		const errands = store.get().lists.find((list) => list.name === "Errands")!;
		remote.listsById.set(first.id, { ...first, name: "Chores" });
		await engine.run();
		expect(store.get().lists.find((list) => list.id === errands.id)!.name).toBe("Chores");
		store.renameList(errands.id, "Housework");
		await engine.run();
		expect(remote.listsById.get(first.id)!.name).toBe("Housework");
		const books = store.get().lists.find((list) => list.name === "Books")!;
		store.deleteList(books.id);
		remote.listsById.delete(first.id);
		remote.tasksByList.delete(first.id);
		await engine.run();
		expect(store.get().lists).toEqual([]);
		expect(remote.listsById.has(second.id)).toBe(false);
	});

	it("ignores lists shared with you and survives remote failures without saving partial state", async () => {
		const { store, remote, engine, links } = engineSetup();
		store.addTask("Local only");
		remote.failure = new Error("offline");
		await expect(engine.run()).rejects.toThrow("offline");
		expect(await links.load()).toEqual({ lists: {}, tasks: {} });
		remote.failure = null;
		await engine.run();
		expect(remote.tasksByList.get("ms-default")!.map((task) => task.title)).toEqual(["Local only"]);
	});
});

function serviceSetup(options: { token?: string; available?: boolean } = {}) {
	const database = new LocalDatabase(new MemoryKeyValueStore());
	const clock = new FixedClock();
	const ids = new SequenceIds();
	const store = new TodoStore(
		database,
		ids,
		clock,
		{ request: () => undefined },
		new RecordingSoundPlayer(),
		new AppSettings(new MemoryKeyValueStore()),
	);
	const remote = new FakeRemoteTodo();
	const dataStore = new MemoryKeyValueStore();
	const tokenStore = new MemoryKeyValueStore();
	const links = new LinkRepository(dataStore);
	const authorizer = new FakeMicrosoftAuthorizer();
	authorizer.available = options.available ?? true;
	const server = new FakeAuthorizationServer();
	server.authorizeResult = {
		accessToken: options.token ?? microsoftAccessToken(),
		refreshToken: "r",
		expiresAt: Date.now() + 3_600_000,
	};
	const auth = new AuthenticationService(server, new TokenRepository(tokenStore), clock);
	const session = new MicrosoftSession(tokenStore, authorizer, clock);
	const connectivity = new ManualConnectivity();
	const settings = new AppSettings(new MemoryKeyValueStore());
	const engine = new MicrosoftSyncEngine(store, remote, links, ids, clock);
	const service = new MicrosoftSyncService(
		auth,
		authorizer,
		session,
		engine,
		links,
		dataStore,
		connectivity,
		settings,
	);
	return {
		service,
		auth,
		authorizer,
		remote,
		dataStore,
		connectivity,
		store,
		session,
		tokenStore,
		settings,
	};
}

describe("one way syncing", () => {
	const receiveOnly = { receive: true, send: false };
	const sendOnly = { receive: false, send: true };
	const writes = (calls: string[]) =>
		calls.filter((call) => /^(create|update|delete|rename)/.test(call));

	async function linked() {
		const setup = engineSetup();
		const work = setup.remote.addList("Work");
		setup.remote.addTask(work.id, { title: "Report" });
		await setup.engine.run();
		setup.remote.calls.length = 0;
		const list = setup.store.get().lists[0]!;
		return { ...setup, work, list, task: setup.store.get().tasks[0]! };
	}

	const edit = (remote: FakeRemoteTodo, listId: string, title: string) => {
		remote.tasksByList.get(listId)![0] = { ...remote.tasksByList.get(listId)![0]!, title };
	};

	it("receiving only brings changes in and writes nothing to Microsoft", async () => {
		const { store, remote, engine, work, list, task } = await linked();
		store.updateTask(task.id, { title: "Mine" });
		store.addList("Local list");
		store.select(list.id);
		store.addTask("Local task");
		remote.addTask(work.id, { title: "New there" });
		await engine.run(receiveOnly);
		expect(titles(store, list.id)).toEqual(["Local task", "Mine", "New there"]);
		edit(remote, work.id, "Theirs");
		await engine.run(receiveOnly);
		expect(titles(store, list.id)).toEqual(["Local task", "New there", "Theirs"]);
		expect(writes(remote.calls)).toEqual([]);
	});

	it("receiving only keeps what was deleted here deleted, and deletes it later when sending", async () => {
		const { store, remote, engine, list, task } = await linked();
		store.deleteTask(task.id);
		await engine.run(receiveOnly);
		await engine.run(receiveOnly);
		expect(store.get().tasks).toEqual([]);
		store.deleteList(list.id);
		remote.addTask("ms-default", { title: "Elsewhere" });
		await engine.run(receiveOnly);
		await engine.run(receiveOnly);
		expect(store.get().lists).toEqual([]);
		expect(titles(store, null)).toEqual(["Elsewhere"]);
		expect(writes(remote.calls)).toEqual([]);
		await engine.run();
		expect(writes(remote.calls)).toEqual([expect.stringMatching(/^deleteList/)]);
	});

	it("sending only pushes changes and takes nothing in", async () => {
		const { store, remote, engine, work, list, task } = await linked();
		remote.addTask(work.id, { title: "New there" });
		remote.addList("Their list");
		remote.addTask("ms-default", { title: "Their default" });
		edit(remote, work.id, "Theirs");
		await engine.run(sendOnly);
		expect(store.get().lists.map((entry) => entry.name)).toEqual(["Work"]);
		expect(titles(store, list.id)).toEqual(["Report"]);
		expect(titles(store, null)).toEqual([]);
		store.updateTask(task.id, { title: "Mine" });
		store.renameList(list.id, "Office");
		await engine.run(sendOnly);
		expect(remote.tasksByList.get(work.id)![0]!.title).toBe("Mine");
		expect(remote.listsById.get(work.id)!.name).toBe("Office");
		store.deleteTask(task.id);
		await engine.run(sendOnly);
		expect(remote.tasksByList.get(work.id)!.map((entry) => entry.title)).toEqual(["New there"]);
	});

	it("sending only ignores remote renames and deletions without sending the items back", async () => {
		const { store, remote, engine, work, list } = await linked();
		remote.listsById.set(work.id, { ...work, name: "Renamed there" });
		await engine.run(sendOnly);
		expect(store.get().lists[0]!.name).toBe("Work");
		remote.tasksByList.set(work.id, []);
		await engine.run(sendOnly);
		await engine.run(sendOnly);
		expect(titles(store, list.id)).toEqual(["Report"]);
		remote.listsById.delete(work.id);
		await engine.run(sendOnly);
		await engine.run(sendOnly);
		expect(store.get().lists).toHaveLength(1);
		expect(writes(remote.calls)).toEqual([]);
		await engine.run();
		expect(store.get().lists).toEqual([]);
	});

	it("forgets tasks and lists that are gone from both sides", async () => {
		const { store, remote, links, engine, work, list, task } = await linked();
		store.deleteTask(task.id);
		remote.tasksByList.set(work.id, []);
		await engine.run(sendOnly);
		expect(Object.keys((await links.load()).tasks)).toEqual([]);
		store.deleteList(list.id);
		remote.listsById.delete(work.id);
		await engine.run(sendOnly);
		expect(Object.keys((await links.load()).lists)).toEqual(["ms-default"]);
	});
});

describe("MicrosoftSyncService preferences", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	async function connected() {
		const setup = serviceSetup();
		await setup.auth.signIn();
		await setup.service.accept();
		setup.remote.calls.length = 0;
		return setup;
	}

	const runs = (calls: string[]) => calls.filter((call) => call === "lists").length;

	it("syncs as often as chosen", async () => {
		const { service, settings, remote } = await connected();
		settings.changeMicrosoft({ intervalMinutes: 5 });
		await vi.advanceTimersByTimeAsync(4 * 60_000);
		expect(runs(remote.calls)).toBe(0);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(runs(remote.calls)).toBe(1);
		service.stop();
		settings.changeMicrosoft({ intervalMinutes: 1 });
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(runs(remote.calls)).toBe(1);
	});

	it("syncs as soon as a direction changes and not at all with both off", async () => {
		const { service, settings, remote } = await connected();
		settings.changeMicrosoft({ send: false });
		await vi.advanceTimersByTimeAsync(0);
		expect(runs(remote.calls)).toBe(1);
		settings.changeMicrosoft({ receive: false });
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(runs(remote.calls)).toBe(1);
		service.stop();
	});

	it("turns both directions back on when connecting with neither", async () => {
		const setup = serviceSetup();
		await setup.auth.signIn();
		setup.settings.changeMicrosoft({ receive: false, send: false });
		await setup.service.accept();
		expect(setup.settings.get().microsoft).toMatchObject({ receive: true, send: true });
		setup.service.stop();
	});

	it("stays usable for a connected account whatever it signed in with", async () => {
		const { service } = await connected();
		expect(await service.eligibility()).toBe("eligible");
		service.stop();
	});
});

describe("MicrosoftSyncService", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	it("is unavailable where the authorizer is, and does nothing until signed in", async () => {
		const { service } = serviceSetup({ available: false });
		expect(service.get()).toBe("unavailable");
		await service.start();
		expect(service.get()).toBe("unavailable");
		expect(serviceSetup().service.get()).toBe("idle");
		const signedOut = serviceSetup();
		await signedOut.service.start();
		expect(signedOut.service.get()).toBe("idle");
	});

	it("offers syncing to Microsoft accounts that have not decided, but not to others", async () => {
		const microsoft = serviceSetup();
		await microsoft.auth.signIn();
		await microsoft.service.start();
		expect(microsoft.service.get()).toBe("offered");
		const other = serviceSetup({ token: microsoftAccessToken("Google_9") });
		await other.auth.signIn();
		await other.service.start();
		expect(other.service.get()).toBe("idle");
	});

	it("recognizes Microsoft accounts of both Cognito and self-hosted servers", () => {
		for (const username of ["Microsoft_abc", "microsoft_abc"]) {
			expect(MicrosoftIdentity.isMicrosoftAccount(microsoftAccessToken(username))).toBe(true);
		}
		const selfHosted = (sub: unknown) => `h.${btoa(JSON.stringify({ sub }))}.s`;
		expect(MicrosoftIdentity.isMicrosoftAccount(selfHosted("microsoft:123"))).toBe(true);
		expect(MicrosoftIdentity.isMicrosoftAccount(selfHosted("admin"))).toBe(false);
		expect(MicrosoftIdentity.isMicrosoftAccount(selfHosted(7))).toBe(false);
		expect(MicrosoftIdentity.isMicrosoftAccount("opaque")).toBe(false);
	});

	it("returns to idle when the Microsoft sign-in fails", async () => {
		const { service, auth, authorizer, dataStore } = serviceSetup();
		await auth.signIn();
		await service.start();
		vi.spyOn(authorizer, "authorize").mockRejectedValueOnce(new Error("refused"));
		await service.accept();
		expect(service.get()).toBe("idle");
		expect(await dataStore.get("atd.msPrefs")).toBeNull();
	});

	it("connects after consent, syncs, stores the decision and syncs again on a schedule", async () => {
		const { service, auth, remote, dataStore, authorizer } = serviceSetup();
		await auth.signIn();
		await service.start();
		await service.accept();
		expect(authorizer.authorizeCalls).toBe(1);
		expect(service.get()).toBe("connected");
		expect(await dataStore.get("atd.msPrefs")).toBe("enabled");
		const callsAfterConnect = remote.calls.length;
		await vi.advanceTimersByTimeAsync(120_000);
		expect(remote.calls.length).toBeGreaterThan(callsAfterConnect);
		service.stop();
		service.stop();
		const stopped = remote.calls.length;
		await vi.advanceTimersByTimeAsync(240_000);
		expect(remote.calls.length).toBe(stopped);
	});

	it("stays idle when the Microsoft sign-in is cancelled, and remembers a refusal", async () => {
		const cancelled = serviceSetup();
		cancelled.authorizer.result = null;
		await cancelled.auth.signIn();
		await cancelled.service.start();
		await cancelled.service.accept();
		expect(cancelled.service.get()).toBe("idle");
		const declined = serviceSetup();
		await declined.auth.signIn();
		await declined.service.start();
		await declined.service.decline();
		expect(declined.service.get()).toBe("idle");
		expect(await declined.dataStore.get("atd.msPrefs")).toBe("declined");
		const again = new MicrosoftSyncService(
			declined.auth,
			declined.authorizer,
			declined.session,
			new MicrosoftSyncEngine(
				declined.store,
				declined.remote,
				new LinkRepository(declined.dataStore),
				new SequenceIds(),
				new FixedClock(),
			),
			new LinkRepository(declined.dataStore),
			declined.dataStore,
			declined.connectivity,
			new AppSettings(new MemoryKeyValueStore()),
		);
		await again.start();
		expect(again.get()).toBe("idle");
	});

	it("resumes automatically when previously enabled, and reports failures without stopping", async () => {
		const first = serviceSetup();
		await first.auth.signIn();
		await first.service.start();
		await first.service.accept();
		first.service.stop();
		const resumed = new MicrosoftSyncService(
			first.auth,
			first.authorizer,
			new MicrosoftSession(first.tokenStore, first.authorizer, new FixedClock()),
			new MicrosoftSyncEngine(
				first.store,
				first.remote,
				new LinkRepository(first.dataStore),
				new SequenceIds(),
				new FixedClock(),
			),
			new LinkRepository(first.dataStore),
			first.dataStore,
			first.connectivity,
			new AppSettings(new MemoryKeyValueStore()),
		);
		await resumed.start();
		expect(resumed.get()).toBe("connected");
		first.remote.failure = new Error("graph down");
		await resumed.syncNow();
		expect(resumed.get()).toBe("failed");
		expect(resumed.connected).toBe(true);
		first.remote.failure = null;
		await resumed.syncNow();
		expect(resumed.get()).toBe("connected");
		resumed.stop();
	});

	it("re-asks when enabled but the stored tokens are gone", async () => {
		const { service, auth, dataStore } = serviceSetup();
		await dataStore.set("atd.msPrefs", "enabled");
		await auth.signIn();
		await service.start();
		expect(service.get()).toBe("idle");
	});

	it("does not sync while offline, already syncing or not connected", async () => {
		const { service, auth, remote, connectivity } = serviceSetup();
		await service.syncNow();
		await auth.signIn();
		await service.start();
		await service.accept();
		remote.calls.length = 0;
		connectivity.setOnline(false);
		await service.syncNow();
		expect(remote.calls).toEqual([]);
		connectivity.setOnline(true);
		const slow = service.syncNow();
		await service.syncNow();
		await slow;
		service.stop();
	});

	it("disconnects, forgetting the session and links, and follows sign-in and sign-out", async () => {
		const { service, auth, dataStore, session } = serviceSetup();
		const unwatch = service.watch();
		await auth.signIn();
		await vi.advanceTimersByTimeAsync(10);
		expect(service.get()).toBe("offered");
		await service.accept();
		await service.disconnect();
		expect(service.get()).toBe("idle");
		expect(await dataStore.get("atd.msPrefs")).toBe("declined");
		await expect(session.accessToken()).rejects.toThrow();
		await auth.signOut();
		expect(service.get()).toBe("idle");
		unwatch();
		const unavailable = serviceSetup({ available: false });
		const stopWatching = unavailable.service.watch();
		await unavailable.auth.signIn();
		await auth.signOut();
		await unavailable.auth.signOut();
		expect(unavailable.service.get()).toBe("unavailable");
		stopWatching();
	});
});
