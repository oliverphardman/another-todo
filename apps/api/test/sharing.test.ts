import { describe, expect, it } from "vitest";
import { SharedAccess } from "../src/application/shared-access";
import { ChangeNotifier } from "../src/application/change-notifier";
import { Connection } from "../src/domain/connection";
import { ForbiddenError, NotFoundError, ValidationError } from "../src/domain/errors";
import { InMemoryShareRepository } from "../src/infrastructure/memory/in-memory-share-repository";
import { Share } from "../src/domain/share";
import { CognitoUserDirectory } from "../src/infrastructure/aws/cognito-user-directory";
import { DynamoConnectionRepository } from "../src/infrastructure/aws/dynamo-connection-repository";
import { event } from "./support/events";
import { FakeDocumentClient } from "./support/fake-document-client";
import { createServices } from "./support/fixtures";
import { RecordingPusher, createTestApi, testDirectory } from "./support/test-api";

const NOW = new Date("2026-11-19T10:00:00Z");

describe("Share", () => {
	it("builds memberships and grants with distinct keys and serializes for the API", () => {
		const membership = Share.membership("alice", "l1", "bob", "bob@x.com", NOW);
		const grant = Share.grant("alice", "l1", "bob", "bob@x.com", NOW);
		expect([membership.ownerId, membership.isMembership, membership.isGrant]).toEqual([
			"bob",
			true,
			false,
		]);
		expect([grant.ownerId, grant.isMembership, grant.isGrant]).toEqual(["alice", false, true]);
		expect(membership.id).toBe(Share.membershipId("alice", "l1"));
		expect(grant.id).toBe(Share.grantId("l1", "bob"));
		expect(Share.restore(grant.toRecord()).toRecord()).toEqual(grant.toRecord());
		expect(JSON.parse(JSON.stringify(grant))).toEqual({
			id: "bob",
			email: "bob@x.com",
			createdAt: NOW.toISOString(),
		});
		expect(grant.listOwnerId).toBe("alice");
		expect(grant.listId).toBe("l1");
		expect(grant.memberId).toBe("bob");
		expect(grant.email).toBe("bob@x.com");
	});
});

describe("ShareService", () => {
	function setup() {
		const services = createServices();
		services.directory.register("bob@x.com", "bob");
		services.directory.register("alice@x.com", "alice");
		return services;
	}

	it("shares a list with a registered email and lists or removes members", async () => {
		const { lists, shares } = setup();
		const list = await lists.create("alice", { name: "Trip" });
		const share = await shares.add("alice", list.id, " bob@x.com ");
		expect(share.memberId).toBe("bob");
		await shares.add("alice", list.id, "bob@x.com");
		expect((await shares.list("alice", list.id)).map((entry) => entry.email)).toEqual([
			"bob@x.com",
		]);
		expect((await shares.list("bob", list.id)).map((entry) => entry.email)).toEqual(["bob@x.com"]);
		expect([...(await shares.sharedKeys("bob"))]).toEqual([`alice#${list.id}`]);
		expect(await shares.peers("alice")).toEqual(["bob"]);
		expect(await shares.peers("bob")).toEqual(["alice"]);
		await shares.remove("alice", list.id, "bob");
		expect(await shares.list("alice", list.id)).toEqual([]);
		expect((await lists.list("bob")).length).toBe(0);
	});

	it("refuses bad requests", async () => {
		const { lists, shares } = setup();
		const list = await lists.create("alice", { name: "Trip" });
		await expect(shares.add("alice", list.id, 4)).rejects.toThrow(ValidationError);
		await expect(shares.add("alice", list.id, "  ")).rejects.toThrow("non-empty");
		await expect(shares.add("alice", list.id, "nobody@x.com")).rejects.toThrow(NotFoundError);
		await expect(shares.add("alice", list.id, "alice@x.com")).rejects.toThrow("already own");
		await expect(shares.add("alice", "ghost", "bob@x.com")).rejects.toThrow(NotFoundError);
		await shares.add("alice", list.id, "bob@x.com");
		await expect(shares.add("bob", list.id, "alice@x.com")).rejects.toThrow(ForbiddenError);
		await expect(shares.list("carol", list.id)).rejects.toThrow(NotFoundError);
		await expect(shares.remove("carol", list.id, "bob")).rejects.toThrow(NotFoundError);
	});

	it("lets a member leave but not remove others, and orders members by invitation", async () => {
		const services = setup();
		services.directory.register("carol@x.com", "carol");
		const list = await services.lists.create("alice", { name: "Trip" });
		await services.shares.add("alice", list.id, "carol@x.com");
		await services.shares.add("alice", list.id, "bob@x.com");
		expect((await services.shares.list("alice", list.id)).map((entry) => entry.memberId)).toEqual([
			"bob",
			"carol",
		]);
		await expect(services.shares.remove("bob", list.id, "carol")).rejects.toThrow(ForbiddenError);
		await services.shares.remove("bob", list.id, "bob");
		expect((await services.shares.list("alice", list.id)).map((entry) => entry.memberId)).toEqual([
			"carol",
		]);
	});
});

describe("lists and tasks shared between people", () => {
	async function shared() {
		const services = createServices();
		services.directory.register("bob@x.com", "bob");
		const list = await services.lists.create("alice", { name: "Trip" });
		await services.shares.add("alice", list.id, "bob@x.com");
		return { ...services, list };
	}

	it("skips a membership whose list no longer exists", async () => {
		const { lists, listRepository, list } = await shared();
		await listRepository.delete("alice", list.id);
		expect(await lists.list("bob")).toEqual([]);
		await expect(lists.get("bob", list.id)).rejects.toThrow(NotFoundError);
		await expect(lists.get("carol", list.id)).rejects.toThrow(NotFoundError);
	});

	it("shows a shared list and its tasks to the member and lets them add and edit tasks", async () => {
		const { lists, tasks, list } = await shared();
		await tasks.create("alice", { id: "t1", title: "Passports", listId: list.id });
		await tasks.create("alice", { id: "private", title: "Mine" });
		expect((await lists.list("bob")).map((entry) => entry.id)).toEqual([list.id]);
		expect((await lists.get("bob", list.id)).name).toBe("Trip");
		expect((await tasks.list("bob")).map((task) => task.id)).toEqual(["t1"]);
		expect((await tasks.list("bob", list.id)).map((task) => task.id)).toEqual(["t1"]);
		expect(await tasks.list("bob", "other")).toEqual([]);
		const added = await tasks.create("bob", { id: "t2", title: "Tickets", listId: list.id });
		expect(added.ownerId).toBe("alice");
		expect((await tasks.create("bob", { id: "t2", title: "Tickets", listId: list.id })).id).toBe(
			"t2",
		);
		expect((await tasks.get("bob", "t1")).title).toBe("Passports");
		expect((await tasks.update("bob", "t1", { completed: true })).completed).toBe(true);
		expect((await tasks.list("alice")).map((task) => task.id).sort()).toEqual([
			"private",
			"t1",
			"t2",
		]);
		await tasks.delete("bob", "t2");
		await expect(tasks.get("alice", "t2")).rejects.toThrow(NotFoundError);
	});

	it("keeps unshared tasks private and refuses moves between owners", async () => {
		const { tasks, list, lists } = await shared();
		await tasks.create("alice", { id: "private", title: "Mine" });
		await tasks.create("alice", { id: "t1", title: "Passports", listId: list.id });
		await expect(tasks.get("bob", "private")).rejects.toThrow(NotFoundError);
		await expect(tasks.update("bob", "private", { title: "X" })).rejects.toThrow(NotFoundError);
		await expect(tasks.create("bob", { title: "X", listId: "ghost" })).rejects.toThrow(
			ValidationError,
		);
		const own = await lists.create("bob", { name: "Mine" });
		await expect(tasks.update("bob", "t1", { listId: own.id })).rejects.toThrow("different owners");
		await expect(tasks.update("bob", "t1", { listId: null })).rejects.toThrow("different owners");
		const second = await lists.create("alice", { name: "Second" });
		await expect(tasks.update("alice", "t1", { listId: second.id })).resolves.toBeDefined();
		await expect(tasks.update("alice", "t1", { listId: own.id })).rejects.toThrow(ValidationError);
		await expect(tasks.update("alice", "t1", { listId: null })).resolves.toBeDefined();
		await tasks.create("bob", { id: "mine", title: "Own", listId: own.id });
		expect((await tasks.list("bob")).map((task) => task.id)).toEqual(["mine"]);
	});

	it("does not let members rename, reorder or group a shared list, but lets them leave", async () => {
		const { lists, tasks, list } = await shared();
		await expect(lists.update("bob", list.id, { name: "X" })).rejects.toThrow(ForbiddenError);
		await tasks.create("bob", { id: "t1", title: "Mine", listId: list.id });
		await lists.delete("bob", list.id);
		expect(await lists.list("bob")).toEqual([]);
		expect((await tasks.get("alice", "t1")).title).toBe("Mine");
		expect((await lists.get("alice", list.id)).name).toBe("Trip");
	});

	it("revokes access when the owner deletes the list", async () => {
		const { lists, tasks, shares, list } = await shared();
		await tasks.create("alice", { id: "t1", title: "Passports", listId: list.id });
		await lists.delete("alice", list.id);
		expect(await lists.list("bob")).toEqual([]);
		expect(await tasks.list("bob")).toEqual([]);
		expect((await shares.sharedKeys("bob")).size).toBe(0);
	});

	it("skips shared lists that no longer exist", async () => {
		const services = await shared();
		const access = new SharedAccess(new InMemoryShareRepository());
		expect(await access.peers("nobody")).toEqual([]);
		await services.lists.delete("alice", services.list.id);
		expect(await services.lists.list("bob")).toEqual([]);
		await expect(services.lists.get("bob", services.list.id)).rejects.toThrow(NotFoundError);
	});
});

describe("sharing over HTTP and notifications", () => {
	it("shares a list through the API and notifies both people", async () => {
		const pusher = new RecordingPusher();
		const client = new FakeDocumentClient(2);
		const connections = new DynamoConnectionRepository(client.asClient(), "connections");
		await connections.save(Connection.open("alice", "ca", NOW, 60));
		await connections.save(Connection.open("bob", "cb", NOW, 60));
		testDirectory.register("bob@x.com", "bob");
		const api = createTestApi(client, pusher);
		const as = (sub: string, request: Parameters<typeof event>[0]) =>
			api(event({ ...request, sub }));
		const list = (await as("alice", { method: "POST", path: "/lists", body: { name: "Trip" } }))
			.body;
		expect(list).toMatchObject({ owned: true, shared: false });
		pusher.pushed.length = 0;
		const created = await as("alice", {
			method: "POST",
			path: `/lists/${list.id}/shares`,
			body: { email: "bob@x.com" },
		});
		expect(created.status).toBe(201);
		expect(created.body.email).toBe("bob@x.com");
		expect(pusher.pushed.map((entry) => entry.connectionId).sort()).toEqual(["ca", "cb"]);
		const bobLists = (await as("bob", { path: "/lists" })).body.lists;
		expect(bobLists).toHaveLength(1);
		expect(bobLists[0]).toMatchObject({ id: list.id, owned: false, shared: true });
		expect((await as("alice", { path: "/lists" })).body.lists[0]).toMatchObject({
			owned: true,
			shared: true,
		});
		expect((await as("bob", { path: `/lists/${list.id}` })).body.owned).toBe(false);
		const task = await as("bob", {
			method: "POST",
			path: "/tasks",
			body: { title: "Tickets", listId: list.id },
		});
		expect(task.status).toBe(201);
		expect((await as("alice", { path: "/tasks" })).body.tasks).toHaveLength(1);
		expect((await as("bob", { path: `/lists/${list.id}/shares` })).body.shares).toHaveLength(1);
		const renamed = await as("bob", {
			method: "PATCH",
			path: `/lists/${list.id}`,
			body: { name: "Nope" },
		});
		expect(renamed.status).toBe(403);
		const unknown = await as("alice", {
			method: "POST",
			path: `/lists/${list.id}/shares`,
			body: { email: "ghost@x.com" },
		});
		expect(unknown.status).toBe(404);
		const removed = await as("bob", {
			method: "DELETE",
			path: `/lists/${list.id}/shares/bob`,
		});
		expect(removed.status).toBe(204);
		expect((await as("bob", { path: "/lists" })).body.lists).toHaveLength(0);
		expect(
			(await as("alice", { method: "POST", path: `/lists/${list.id}/shares`, body: {} })).status,
		).toBe(400);
	});
});

describe("ChangeNotifier with peers", () => {
	it("notifies the user and every peer", async () => {
		const client = new FakeDocumentClient();
		const connections = new DynamoConnectionRepository(client.asClient(), "connections");
		await connections.save(Connection.open("a", "ca", NOW, 60));
		await connections.save(Connection.open("b", "cb", NOW, 60));
		const pusher = new RecordingPusher();
		await new ChangeNotifier(connections, pusher, { peers: async () => ["b"] }).notify("a");
		expect(pusher.pushed.map((entry) => entry.connectionId).sort()).toEqual(["ca", "cb"]);
	});
});

describe("CognitoUserDirectory", () => {
	it("finds a user by email with an escaped filter and reports unknown emails", async () => {
		const sent: { input: { Filter: string; UserPoolId: string } }[] = [];
		const directory = new CognitoUserDirectory(
			{
				send: async (command: unknown) => {
					sent.push(command as never);
					return sent.length === 1
						? {
								Users: [
									{
										Attributes: [
											{ Name: "email", Value: "a" },
											{ Name: "sub", Value: "s1" },
										],
									},
								],
							}
						: sent.length === 2
							? { Users: [{ Attributes: [] }] }
							: {};
				},
			} as never,
			"eu-west-1_pool",
		);
		expect(await directory.findByEmail('a"b\\c@x.com')).toEqual({
			sub: "s1",
			email: 'a"b\\c@x.com',
		});
		expect(sent[0]!.input.Filter).toBe('email = "a\\"b\\\\c@x.com"');
		expect(sent[0]!.input.UserPoolId).toBe("eu-west-1_pool");
		expect(await directory.findByEmail("x@x.com")).toBeNull();
		expect(await directory.findByEmail("y@x.com")).toBeNull();
		expect(CognitoUserDirectory.forPool("eu-west-1_pool")).toBeInstanceOf(CognitoUserDirectory);
	});
});
