import { describe, expect, it } from "vitest";
import { ApiError, AuthRequiredError, NetworkError } from "../src/api/errors";
import { HttpApiGateway } from "../src/api/http-api-gateway";
import { taskData } from "./support/fakes";

interface Recorded {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: unknown;
}

function setup(respond: () => Response | Error = () => new Response(null, { status: 204 })) {
	const calls: Recorded[] = [];
	const gateway = new HttpApiGateway(
		"https://api.test",
		{ getAccessToken: async () => "token-1" },
		async (url, init) => {
			calls.push({
				method: init?.method ?? "",
				url,
				headers: init?.headers as Record<string, string>,
				body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
			});
			const result = respond();
			if (result instanceof Error) {
				throw result;
			}
			return result;
		},
	);
	return { gateway, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("HttpApiGateway", () => {
	it("lists lists and tasks with a bearer token", async () => {
		const lists = setup(() => json({ lists: [{ id: "l", name: "L", createdAt: "x" }] }));
		expect(await lists.gateway.listLists()).toEqual([{ id: "l", name: "L", createdAt: "x" }]);
		expect(lists.calls[0]).toMatchObject({
			method: "GET",
			url: "https://api.test/lists",
			headers: { authorization: "Bearer token-1" },
		});
		const tasks = setup(() => json({ tasks: [taskData({ id: "t" })] }));
		expect((await tasks.gateway.listTasks())[0]!.id).toBe("t");
	});

	it("lists and replaces view settings", async () => {
		const listed = setup(() =>
			json({
				settings: [
					{
						id: "my-day",
						sort: "due",
						sortDescending: true,
						hideCompleted: true,
						theme: { type: "color", color: "#c0392b" },
						updatedAt: "x",
					},
					{ id: "tasks", sort: null, hideCompleted: false, theme: null, updatedAt: "x" },
				],
			}),
		);
		expect(await listed.gateway.listSettings()).toEqual([
			{
				id: "my-day",
				sort: "due",
				sortDescending: true,
				hideCompleted: true,
				theme: { type: "color", color: "#c0392b" },
			},
			{ id: "tasks", sort: null, sortDescending: undefined, hideCompleted: false, theme: null },
		]);
		const put = setup();
		await put.gateway.putSettings({
			id: "my day",
			sort: "created",
			hideCompleted: false,
			theme: null,
		});
		expect(put.calls[0]).toMatchObject({
			method: "PUT",
			url: "https://api.test/view-settings/my%20day",
			body: { sort: "created", sortDescending: false, hideCompleted: false, theme: null },
		});
	});

	it("sends the client id so creation is idempotent", async () => {
		const { gateway, calls } = setup();
		await gateway.createList({ id: "l1", name: "Work", createdAt: "x" });
		await gateway.createTask(taskData({ id: "t1", title: "A", listId: "l1" }));
		expect(calls[0]!.body).toEqual({ id: "l1", name: "Work" });
		expect(calls[0]!.headers["content-type"]).toBe("application/json");
		expect(calls[1]!.body).toEqual({
			id: "t1",
			title: "A",
			completed: false,
			importance: "normal",
			listId: "l1",
			myDay: null,
			myDayDismissed: null,
			steps: [],
			note: "",
			dueDate: null,
		});
	});

	it("lists, creates, renames, assigns and deletes groups", async () => {
		const groups = setup(() =>
			json({ groups: [{ id: "g", name: "G", createdAt: "x", position: 1 }] }),
		);
		expect(await groups.gateway.listGroups()).toEqual([
			{ id: "g", name: "G", createdAt: "x", position: 1 },
		]);
		const { gateway, calls } = setup();
		await gateway.createGroup({ id: "g1", name: "Home", createdAt: "x" });
		await gateway.renameGroup("g/1", "House");
		await gateway.setListGroup("l1", "g1");
		await gateway.setListGroup("l1", null);
		await gateway.deleteGroup("g/1");
		expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
			"POST https://api.test/groups",
			"PATCH https://api.test/groups/g%2F1",
			"PATCH https://api.test/lists/l1",
			"PATCH https://api.test/lists/l1",
			"DELETE https://api.test/groups/g%2F1",
		]);
		expect(calls[0]!.body).toEqual({ id: "g1", name: "Home" });
		expect(calls[2]!.body).toEqual({ groupId: "g1" });
		expect(calls[3]!.body).toEqual({ groupId: null });
	});

	it("updates and deletes with encoded ids", async () => {
		const { gateway, calls } = setup();
		await gateway.updateTask("a b", { completed: true });
		await gateway.renameList("l/1", "New");
		await gateway.moveList("l/2", 7);
		await gateway.deleteTask("t1");
		await gateway.deleteList("l1");
		expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
			"PATCH https://api.test/tasks/a%20b",
			"PATCH https://api.test/lists/l%2F1",
			"PATCH https://api.test/lists/l%2F2",
			"DELETE https://api.test/tasks/t1",
			"DELETE https://api.test/lists/l1",
		]);
		expect(calls[0]!.body).toEqual({ completed: true });
		expect(calls[3]!.headers["content-type"]).toBeUndefined();
	});

	it("raises ApiError with the server message", async () => {
		const { gateway } = setup(() => json({ error: "title is required" }, 400));
		const error = await gateway
			.createTask(taskData({ id: "x" }))
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(400);
		expect((error as ApiError).message).toBe("title is required");
	});

	it("falls back to the status text when the error body is unusable", async () => {
		const missing = setup(() => json({}, 404));
		await expect(missing.gateway.deleteTask("x")).rejects.toMatchObject({ status: 404 });
		const html = setup(() => new Response("<html>", { status: 502, statusText: "Bad Gateway" }));
		await expect(html.gateway.deleteTask("x")).rejects.toThrow("Bad Gateway");
	});

	it("maps connection failures to NetworkError", async () => {
		const { gateway } = setup(() => new TypeError("failed to fetch"));
		await expect(gateway.listTasks()).rejects.toBeInstanceOf(NetworkError);
	});

	it("propagates sign-in errors from the token provider", async () => {
		const gateway = new HttpApiGateway(
			"https://api.test",
			{
				getAccessToken: async () => {
					throw new AuthRequiredError();
				},
			},
			async () => new Response(null),
		);
		await expect(gateway.listTasks()).rejects.toBeInstanceOf(AuthRequiredError);
	});

	it("uses the global fetch by default", async () => {
		const original = globalThis.fetch;
		globalThis.fetch = (async () => json({ tasks: [] })) as typeof fetch;
		try {
			const gateway = new HttpApiGateway("https://api.test", { getAccessToken: async () => "t" });
			expect(await gateway.listTasks()).toEqual([]);
		} finally {
			globalThis.fetch = original;
		}
	});
});

describe("ApiError", () => {
	it("classifies permanent failures", () => {
		expect(new ApiError(400, "").isPermanent).toBe(true);
		expect(new ApiError(404, "").isPermanent).toBe(true);
		expect(new ApiError(408, "").isPermanent).toBe(false);
		expect(new ApiError(429, "").isPermanent).toBe(false);
		expect(new ApiError(500, "").isPermanent).toBe(false);
	});

	it("has sensible default messages for the other errors", () => {
		expect(new NetworkError().message).toBe("The server could not be reached");
		expect(new AuthRequiredError().message).toBe("Sign in required");
	});
});
