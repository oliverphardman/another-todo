import { GoneException } from "@aws-sdk/client-apigatewaymanagementapi";
import { describe, expect, it } from "vitest";
import { ChangeNotifier, CHANGED_MESSAGE } from "../src/application/change-notifier";
import { Connection } from "../src/domain/connection";
import { ApiGatewayPusher } from "../src/infrastructure/api-gateway-pusher";
import { DynamoConnectionRepository } from "../src/infrastructure/dynamo-connection-repository";
import { WebSocketEntry, handle } from "../src/websocket/main";
import {
	CONNECTION_LIFETIME_SECONDS,
	WebSocketHandler,
	type WebSocketEvent,
} from "../src/websocket/websocket-handler";
import { event } from "./support/events";
import { FakeDocumentClient } from "./support/fake-document-client";
import { FixedClock } from "./support/fixtures";
import { RecordingPusher, createTestApi } from "./support/test-api";

const NOW = new Date("2026-11-19T10:00:00Z");

function repository() {
	return new DynamoConnectionRepository(new FakeDocumentClient().asClient(), "connections");
}

describe("Connection", () => {
	it("expires after its lifetime and round-trips", () => {
		const connection = Connection.open("u", "c1", NOW, 60);
		expect(connection.expiresAt).toBe(Math.floor(NOW.getTime() / 1000) + 60);
		expect(Connection.restore(connection.toRecord()).toRecord()).toEqual(connection.toRecord());
	});
});

describe("ChangeNotifier", () => {
	it("tells every connection of the owner and forgets the ones that are gone", async () => {
		const connections = repository();
		await connections.save(Connection.open("u", "live", NOW, 60));
		await connections.save(Connection.open("u", "dead", NOW, 60));
		await connections.save(Connection.open("other", "elsewhere", NOW, 60));
		const pusher = new RecordingPusher();
		pusher.gone.add("dead");
		await new ChangeNotifier(connections, pusher, { peers: async () => [] }).notify("u");
		expect(pusher.pushed.map((entry) => entry.connectionId).sort()).toEqual(["dead", "live"]);
		expect(pusher.pushed[0]!.message).toBe(CHANGED_MESSAGE);
		expect((await connections.list("u")).map((connection) => connection.id)).toEqual(["live"]);
		expect(await connections.list("other")).toHaveLength(1);
	});

	it("keeps a connection when pushing fails for another reason", async () => {
		const connections = repository();
		await connections.save(Connection.open("u", "c1", NOW, 60));
		const pusher = new RecordingPusher();
		pusher.failure = new Error("throttled");
		await new ChangeNotifier(connections, pusher, { peers: async () => [] }).notify("u");
		expect(await connections.list("u")).toHaveLength(1);
	});
});

describe("ApiGatewayPusher", () => {
	it("posts to the connection and reports whether it is still there", async () => {
		const sent: unknown[] = [];
		const ok = new ApiGatewayPusher({
			send: async (command: unknown) => {
				sent.push(command);
				return {};
			},
		} as never);
		expect(await ok.push("c1", "hello")).toBe(true);
		expect((sent[0] as { input: { ConnectionId: string } }).input.ConnectionId).toBe("c1");
		const gone = new ApiGatewayPusher({
			send: async () => {
				throw new GoneException({ message: "gone", $metadata: {} });
			},
		} as never);
		expect(await gone.push("c1", "hello")).toBe(false);
		const broken = new ApiGatewayPusher({
			send: async () => {
				throw new Error("boom");
			},
		} as never);
		await expect(broken.push("c1", "hello")).rejects.toThrow("boom");
		expect(ApiGatewayPusher.forEndpoint("https://ws.example.com/prod")).toBeInstanceOf(
			ApiGatewayPusher,
		);
	});
});

describe("change broadcast over HTTP", () => {
	async function setup() {
		const client = new FakeDocumentClient(2);
		const pusher = new RecordingPusher();
		const connections = new DynamoConnectionRepository(client.asClient(), "connections");
		await connections.save(Connection.open("alice", "c1", NOW, 60));
		return { api: createTestApi(client, pusher), pusher };
	}

	it("notifies the owner's devices after a successful write but not after reads or failures", async () => {
		const { api, pusher } = await setup();
		await api(event({ path: "/tasks", sub: "alice" }));
		expect(pusher.pushed).toHaveLength(0);
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "A" }, sub: "alice" }),
		);
		expect(created.status).toBe(201);
		expect(pusher.pushed).toHaveLength(1);
		const invalid = await api(event({ method: "POST", path: "/tasks", body: {}, sub: "alice" }));
		expect(invalid.status).toBe(400);
		expect(pusher.pushed).toHaveLength(1);
		await api(event({ method: "POST", path: "/tasks", body: { title: "B" }, sub: "bob" }));
		expect(pusher.pushed).toHaveLength(1);
	});

	it("still answers when pushing fails", async () => {
		const { api, pusher } = await setup();
		pusher.failure = new Error("down");
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "A" }, sub: "alice" }),
		);
		expect(created.status).toBe(201);
	});
});

describe("WebSocketHandler", () => {
	const connectEvent = (token?: string): WebSocketEvent => ({
		requestContext: { routeKey: "$connect", connectionId: "c1" },
		queryStringParameters: token === undefined ? null : { token },
	});

	function setup(verify: (token: string) => Promise<{ sub: string }>) {
		const connections = repository();
		return {
			connections,
			handler: new WebSocketHandler({ verify }, connections, new FixedClock(NOW)),
		};
	}

	it("registers a verified connection for its owner", async () => {
		const { handler, connections } = setup(async () => ({ sub: "alice" }));
		expect(await handler.handle(connectEvent("good"))).toEqual({ statusCode: 200 });
		const [saved] = await connections.list("alice");
		expect(saved!.id).toBe("c1");
		expect(saved!.expiresAt).toBe(Math.floor(NOW.getTime() / 1000) + CONNECTION_LIFETIME_SECONDS);
	});

	it("refuses a connection without a valid token", async () => {
		const { handler, connections } = setup(async () => {
			throw new Error("bad");
		});
		expect(await handler.handle(connectEvent())).toEqual({ statusCode: 401 });
		expect(await handler.handle(connectEvent(""))).toEqual({ statusCode: 401 });
		expect(await handler.handle(connectEvent("bad"))).toEqual({ statusCode: 401 });
		expect(await connections.list("alice")).toEqual([]);
		expect(
			await handler.handle({
				requestContext: { routeKey: "$connect", connectionId: "c1" },
			}),
		).toEqual({ statusCode: 401 });
	});

	it("accepts every other route without doing anything", async () => {
		const { handler } = setup(async () => ({ sub: "alice" }));
		expect(
			await handler.handle({ requestContext: { routeKey: "$default", connectionId: "c1" } }),
		).toEqual({ statusCode: 200 });
	});
});

describe("WebSocketEntry", () => {
	it("needs its configuration", () => {
		expect(() => WebSocketEntry.create({})).toThrow("must be set");
		expect(
			WebSocketEntry.create({
				COGNITO_USER_POOL_ID: "eu-west-1_x",
				COGNITO_CLIENT_ID: "c",
				CONNECTIONS_TABLE_NAME: "t",
			}),
		).toBeInstanceOf(WebSocketHandler);
	});

	it("builds its handler on first use", async () => {
		process.env.COGNITO_USER_POOL_ID = "eu-west-1_x";
		process.env.COGNITO_CLIENT_ID = "c";
		process.env.CONNECTIONS_TABLE_NAME = "t";
		const message = { requestContext: { routeKey: "$default", connectionId: "c1" } };
		expect(await handle(message)).toEqual({ statusCode: 200 });
		expect(await handle(message)).toEqual({ statusCode: 200 });
	});
});
