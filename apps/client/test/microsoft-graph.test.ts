import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => {
	const state = {
		promptResult: { type: "success", params: { code: "code-1" } } as {
			type: string;
			params?: { code: string };
		},
		requests: [] as Record<string, unknown>[],
	};
	class AuthRequest {
		codeVerifier = "verifier-1";
		constructor(config: Record<string, unknown>) {
			state.requests.push(config);
		}
		async promptAsync() {
			return state.promptResult;
		}
	}
	return {
		state,
		AuthRequest,
		ResponseType: { Code: "code" },
		makeRedirectUri: vi.fn(() => "anothertodo://auth/microsoft"),
		exchangeCodeAsync: vi.fn(async () => ({
			accessToken: "a1",
			refreshToken: "r1",
			expiresIn: 100,
		})),
		refreshAsync: vi.fn(async () => ({
			accessToken: "a2",
			refreshToken: undefined,
			expiresIn: undefined,
		})),
	};
});

vi.mock("expo-auth-session", () => session);

import { ExpoMicrosoftAuthorizer } from "../src/microsoft/expo-microsoft-authorizer";
import { ExpoMicrosoftAuthorizer as MacAuthorizer } from "../src/microsoft/expo-microsoft-authorizer.macos";
import { ExpoMicrosoftAuthorizer as WindowsAuthorizer } from "../src/microsoft/expo-microsoft-authorizer.windows";
import { GraphError, GraphTodoGateway } from "../src/microsoft/graph-todo-gateway";
import { MicrosoftIdentity } from "../src/microsoft/microsoft-identity";
import { LinkRepository, NO_LINKS } from "../src/microsoft/microsoft-links";
import { MicrosoftSession } from "../src/microsoft/microsoft-session";
import { TaskSnapshot } from "../src/microsoft/remote-todo";
import { UnavailableMicrosoftAuthorizer } from "../src/microsoft/unavailable-microsoft-authorizer";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { FakeMicrosoftAuthorizer, microsoftAccessToken } from "./support/fake-microsoft";
import { FixedClock } from "./support/fakes";

interface Call {
	method: string;
	url: string;
	body: unknown;
	authorization: string | null;
	contentType: string | null;
}

function gateway(respond: (call: Call) => Response) {
	const calls: Call[] = [];
	const instance = new GraphTodoGateway(
		{ accessToken: async () => "graph-token" },
		async (url, init) => {
			const headers = new Headers(init?.headers);
			const call = {
				method: init?.method ?? "GET",
				url,
				body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
				authorization: headers.get("authorization"),
				contentType: headers.get("content-type"),
			};
			calls.push(call);
			return respond(call);
		},
	);
	return { instance, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const BASE = "https://graph.microsoft.com/v1.0/me/todo/lists";

describe("GraphTodoGateway", () => {
	it("reads every page of lists and marks the default list", async () => {
		const { instance, calls } = gateway((call) =>
			call.url === BASE
				? json({
						value: [{ id: "d", displayName: "Tasks", wellknownListName: "defaultList" }],
						"@odata.nextLink": `${BASE}?page=2`,
					})
				: json({
						value: [
							{ id: "x", displayName: "Work", wellknownListName: "none" },
							{ id: "y", displayName: "Home" },
						],
					}),
		);
		expect(await instance.lists()).toEqual([
			{ id: "d", name: "Tasks", isDefault: true },
			{ id: "x", name: "Work", isDefault: false },
			{ id: "y", name: "Home", isDefault: false },
		]);
		expect(calls).toHaveLength(2);
		expect(calls[0]!.authorization).toBe("Bearer graph-token");
		expect(calls[0]!.contentType).toBeNull();
	});

	it("creates, renames and deletes lists", async () => {
		const { instance, calls } = gateway((call) =>
			call.method === "POST"
				? json({ id: "n", displayName: "New" }, 201)
				: new Response(null, { status: call.method === "DELETE" ? 204 : 200 }),
		);
		expect(await instance.createList("New")).toEqual({ id: "n", name: "New", isDefault: false });
		await instance.renameList("a/b", "Renamed");
		await instance.deleteList("a/b");
		expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
			`POST ${BASE}`,
			`PATCH ${BASE}/a%2Fb`,
			`DELETE ${BASE}/a%2Fb`,
		]);
		expect(calls[0]!.body).toEqual({ displayName: "New" });
		expect(calls[0]!.contentType).toBe("application/json");
	});

	it("reads tasks with their steps, due day and notes", async () => {
		const { instance, calls } = gateway(() =>
			json({
				value: [
					{
						id: "t1",
						title: "Full",
						status: "completed",
						importance: "high",
						dueDateTime: { dateTime: "2026-12-24T00:00:00.0000000" },
						body: { content: "note" },
						checklistItems: [{ id: "c1", displayName: "Step", isChecked: true }],
					},
					{
						id: "t2",
						title: "Bare",
						status: "notStarted",
						importance: "normal",
						dueDateTime: null,
						body: null,
					},
					{ id: "t3", title: "Mostly bare", status: "inProgress", importance: "low", body: {} },
				],
			}),
		);
		expect(await instance.tasks("l/1")).toEqual([
			{
				id: "t1",
				title: "Full",
				completed: true,
				important: true,
				dueDay: "2026-12-24",
				note: "note",
				steps: [{ id: "c1", title: "Step", completed: true }],
			},
			{
				id: "t2",
				title: "Bare",
				completed: false,
				important: false,
				dueDay: null,
				note: "",
				steps: [],
			},
			{
				id: "t3",
				title: "Mostly bare",
				completed: false,
				important: false,
				dueDay: null,
				note: "",
				steps: [],
			},
		]);
		expect(calls[0]!.url).toBe(`${BASE}/l%2F1/tasks?$expand=checklistItems`);
	});

	it("creates a task with its checklist", async () => {
		const { instance, calls } = gateway((call) =>
			call.url.endsWith("/checklistItems")
				? json(
						{
							id: `c${calls.length}`,
							displayName: (call.body as { displayName: string }).displayName,
							isChecked: (call.body as { isChecked: boolean }).isChecked,
						},
						201,
					)
				: json({ id: "t9", title: "Made", status: "completed", importance: "high" }, 201),
		);
		const created = await instance.createTask("l1", {
			title: "Made",
			completed: true,
			important: true,
			dueDay: "2026-12-24",
			note: "n",
			steps: [
				{ title: "One", completed: false },
				{ title: "Two", completed: true },
			],
		});
		expect(created.id).toBe("t9");
		expect(created.steps.map((step) => [step.title, step.completed])).toEqual([
			["One", false],
			["Two", true],
		]);
		expect(calls[0]!.body).toEqual({
			title: "Made",
			status: "completed",
			importance: "high",
			body: { content: "n", contentType: "text" },
			dueDateTime: { dateTime: "2026-12-24T00:00:00.0000000", timeZone: "UTC" },
		});
		const bare = gateway(() =>
			json({ id: "t", title: "B", status: "notStarted", importance: "normal" }),
		);
		await bare.instance.createTask("l1", {
			title: "B",
			completed: false,
			important: false,
			dueDay: null,
			note: "",
			steps: [],
		});
		expect(bare.calls[0]!.body).toMatchObject({
			status: "notStarted",
			importance: "normal",
			dueDateTime: null,
		});
	});

	it("updates a task, rewriting the checklist only when it changed", async () => {
		const { instance, calls } = gateway((call) =>
			call.method === "POST"
				? json({ id: "new", displayName: "S", isChecked: false }, 201)
				: new Response(null, { status: call.method === "DELETE" ? 204 : 200 }),
		);
		const task = {
			id: "t1",
			title: "T",
			completed: false,
			important: false,
			dueDay: null,
			note: "",
			steps: [{ id: "c1", title: "S", completed: false }],
		};
		const same = {
			title: "T2",
			completed: false,
			important: false,
			dueDay: null,
			note: "",
			steps: [{ title: "S", completed: false }],
		};
		await instance.updateTask("l1", task, same);
		expect(calls.map((call) => call.method)).toEqual(["PATCH"]);
		calls.length = 0;
		await instance.updateTask("l1", task, { ...same, steps: [{ title: "S", completed: true }] });
		expect(
			calls.map((call) => `${call.method} ${call.url.split("/").slice(-2).join("/")}`),
		).toEqual(["PATCH tasks/t1", "DELETE checklistItems/c1", "POST t1/checklistItems"]);
		calls.length = 0;
		await instance.updateTask("l1", task, { ...same, steps: [] });
		expect(calls.map((call) => call.method)).toEqual(["PATCH", "DELETE"]);
		calls.length = 0;
		await instance.updateTask("l1", task, {
			...same,
			steps: [
				{ title: "S", completed: false },
				{ title: "More", completed: false },
			],
		});
		expect(calls.map((call) => call.method)).toEqual(["PATCH", "DELETE", "POST", "POST"]);
	});

	it("deletes tasks and reports failures with the status", async () => {
		const ok = gateway(() => new Response(null, { status: 204 }));
		await ok.instance.deleteTask("l 1", "t/1");
		expect(ok.calls[0]!.url).toBe(`${BASE}/l%201/tasks/t%2F1`);
		const bad = gateway(() => new Response("no", { status: 401 }));
		await expect(bad.instance.lists()).rejects.toThrow(GraphError);
		await expect(bad.instance.lists()).rejects.toMatchObject({ status: 401 });
	});

	it("uses the global fetch by default", async () => {
		const fetched = vi.fn(async () => json({ value: [] }));
		vi.stubGlobal("fetch", fetched);
		expect(await new GraphTodoGateway({ accessToken: async () => "t" }).lists()).toEqual([]);
		expect(fetched).toHaveBeenCalledTimes(1);
		vi.unstubAllGlobals();
	});
});

describe("TaskSnapshot", () => {
	it("is equal for equal content and different when anything changes", () => {
		const content = {
			title: "A",
			completed: false,
			important: false,
			dueDay: null,
			note: "",
			steps: [{ title: "S", completed: false }],
		};
		expect(TaskSnapshot.of(content)).toBe(TaskSnapshot.of({ ...content }));
		for (const changed of [
			{ title: "B" },
			{ completed: true },
			{ important: true },
			{ dueDay: "2026-01-01" },
			{ note: "x" },
			{ steps: [] },
		]) {
			expect(TaskSnapshot.of({ ...content, ...changed })).not.toBe(TaskSnapshot.of(content));
		}
	});
});

describe("MicrosoftIdentity", () => {
	it("recognizes Cognito users that signed in through Microsoft", () => {
		expect(MicrosoftIdentity.isMicrosoftAccount(microsoftAccessToken())).toBe(true);
		expect(MicrosoftIdentity.isMicrosoftAccount(microsoftAccessToken("Google_1"))).toBe(false);
		expect(MicrosoftIdentity.isMicrosoftAccount(microsoftAccessToken("local-user"))).toBe(false);
		expect(MicrosoftIdentity.isMicrosoftAccount("access-1")).toBe(false);
		expect(MicrosoftIdentity.isMicrosoftAccount("a.b.c")).toBe(false);
		const numeric = `x.${btoa(JSON.stringify({ username: 4 }))}.y`;
		expect(MicrosoftIdentity.isMicrosoftAccount(numeric)).toBe(false);
	});
});

describe("LinkRepository", () => {
	it("loads defaults, saves, reads partial or corrupt data and clears", async () => {
		const storage = new MemoryKeyValueStore();
		const links = new LinkRepository(storage);
		expect(await links.load()).toEqual(NO_LINKS);
		await links.save({ lists: { a: { local: null, name: "Tasks" } }, tasks: {} });
		expect((await links.load()).lists.a!.name).toBe("Tasks");
		await storage.set("atd.msLinks", "{}");
		expect(await links.load()).toEqual(NO_LINKS);
		await storage.set("atd.msLinks", "not json");
		expect(await links.load()).toEqual(NO_LINKS);
		await links.clear();
		expect(await storage.get("atd.msLinks")).toBeNull();
	});
});

describe("MicrosoftSession", () => {
	function make() {
		const storage = new MemoryKeyValueStore();
		const authorizer = new FakeMicrosoftAuthorizer();
		const clock = new FixedClock();
		return {
			storage,
			authorizer,
			clock,
			session: new MicrosoftSession(storage, authorizer, clock),
		};
	}

	it("has nothing to restore until tokens are adopted", async () => {
		const { session, storage } = make();
		expect(await session.restore()).toBe(false);
		await expect(session.accessToken()).rejects.toThrow("Not connected");
		await session.adopt({ accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 1e9 });
		const fresh = new MicrosoftSession(storage, new FakeMicrosoftAuthorizer(), new FixedClock());
		expect(await fresh.restore()).toBe(true);
		await storage.set("atd.msTokens", JSON.stringify({ accessToken: "a", expiresAt: 5 }));
		expect(await fresh.restore()).toBe(true);
		await storage.set("atd.msTokens", "{}");
		const other = new MicrosoftSession(storage, new FakeMicrosoftAuthorizer(), new FixedClock());
		expect(await other.restore()).toBe(false);
		await storage.set("atd.msTokens", "oops");
		expect(await other.restore()).toBe(false);
	});

	it("returns a valid token, refreshes an expired one and keeps the old refresh token", async () => {
		const { session, authorizer, clock } = make();
		await session.adopt({
			accessToken: "a",
			refreshToken: "r",
			expiresAt: clock.now().getTime() + 600_000,
		});
		expect(await session.accessToken()).toBe("a");
		authorizer.refreshed = {
			accessToken: "ms-access-2",
			refreshToken: null,
			expiresAt: clock.now().getTime() + 700_000,
		};
		clock.advance(600_000);
		expect(await session.accessToken()).toBe("ms-access-2");
		expect(authorizer.refreshCalls).toEqual(["r"]);
		clock.advance(10_000_000);
		await session.accessToken();
		expect(authorizer.refreshCalls).toEqual(["r", "r"]);
	});

	it("fails when expired without a refresh token and can be cleared", async () => {
		const { session, clock, storage } = make();
		await session.adopt({
			accessToken: "a",
			refreshToken: null,
			expiresAt: clock.now().getTime() - 1,
		});
		await expect(session.accessToken()).rejects.toThrow("expired");
		await session.clear();
		expect(await storage.get("atd.msTokens")).toBeNull();
	});
});

describe("Microsoft authorizers", () => {
	beforeEach(() => {
		session.state.promptResult = { type: "success", params: { code: "code-1" } };
		session.state.requests.length = 0;
	});

	const authorizer = () =>
		new ExpoMicrosoftAuthorizer(
			{ clientId: "ms-client", scheme: "anothertodo" },
			{ now: () => new Date(1_000) },
		);

	it("asks for the To Do permission with PKCE and exchanges the code", async () => {
		const tokens = await authorizer().authorize();
		expect(session.state.requests[0]).toMatchObject({
			clientId: "ms-client",
			scopes: ["openid", "offline_access", "Tasks.ReadWrite"],
			usePKCE: true,
		});
		expect(tokens).toEqual({ accessToken: "a1", refreshToken: "r1", expiresAt: 1_000 + 100_000 });
		expect(authorizer().available).toBe(true);
	});

	it("returns null when the user cancels and refreshes with defaults", async () => {
		session.state.promptResult = { type: "dismiss" };
		expect(await authorizer().authorize()).toBeNull();
		expect(await authorizer().refresh("r")).toEqual({
			accessToken: "a2",
			refreshToken: null,
			expiresAt: 1_000 + 3_600_000,
		});
	});

	it("is unavailable on desktop", async () => {
		for (const Unavailable of [UnavailableMicrosoftAuthorizer, MacAuthorizer, WindowsAuthorizer]) {
			const instance = new Unavailable();
			expect(instance.available).toBe(false);
			expect(await instance.authorize()).toBeNull();
			await expect(instance.refresh()).rejects.toThrow("not available");
		}
	});
});
