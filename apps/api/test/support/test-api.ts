import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { afterAll } from "vitest";
import { createApp, createServices, type ApiConfig } from "../../src/bootstrap";
import type { Identity } from "../../src/composition/platform";
import {
	ApiGatewayChangeChannel,
	type ConnectionPusher,
} from "../../src/infrastructure/aws/api-gateway-change-channel";
import { DynamoConnectionRepository } from "../../src/infrastructure/aws/dynamo-connection-repository";
import { DynamoDataStore } from "../../src/infrastructure/aws/dynamo-data-store";
import { UnauthorizedError } from "../../src/domain/errors";
import type { Authenticator, Credentials } from "../../src/http/authenticator";
import { FakeUserDirectory } from "./fake-user-directory";
import { FakeDocumentClient } from "./fake-document-client";
import { FakeMediaStorage } from "./fake-media-storage";
import type { ApiRequest } from "./events";

export interface ApiReply {
	readonly status: number;
	readonly body: any;
	readonly raw: string;
	readonly headers: Headers;
}

export const TEST_ISSUER = "https://issuer.example.com";
export const TEST_ORIGIN = "https://app.example.com";

export const TEST_CONFIG: ApiConfig = {
	publicUrl: "https://api.example.com",
	corsOrigins: [TEST_ORIGIN],
	notice: null,
};

export const TEST_TABLES = {
	tasks: "tasks",
	lists: "lists",
	settings: "settings",
	photos: "photos",
	attachments: "attachments",
	groups: "groups",
	shares: "shares",
};

export class TokenIsSubjectAuthenticator implements Authenticator {
	async authenticate(request: Credentials): Promise<string> {
		const token = /^Bearer (\S+)$/.exec(request.header("authorization") ?? "")?.[1];
		if (token === undefined) {
			throw new UnauthorizedError("Authentication required");
		}
		return token;
	}
}

const servers: Server[] = [];

afterAll(async () => {
	await Promise.all(
		servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
	);
});

export const testStorage = new FakeMediaStorage();
export const testDirectory = new FakeUserDirectory();

export class RecordingPusher implements ConnectionPusher {
	readonly pushed: { connectionId: string; message: string }[] = [];
	gone = new Set<string>();
	failure: Error | null = null;

	async push(connectionId: string, message: string): Promise<boolean> {
		if (this.failure !== null) {
			throw this.failure;
		}
		this.pushed.push({ connectionId, message });
		return !this.gone.has(connectionId);
	}
}

export function createTestApi(
	client: { asClient(): DynamoDBDocumentClient } = new FakeDocumentClient(2),
	pusher: ConnectionPusher = new RecordingPusher(),
	directory: FakeUserDirectory = testDirectory,
) {
	const identity: Identity = {
		mode: "external",
		providers: [],
		authenticator: new TokenIsSubjectAuthenticator(),
		directory,
		issuer: TEST_ISSUER,
		signIn: null,
		router: null,
	};
	const app = createApp(
		TEST_CONFIG,
		createServices(
			new DynamoDataStore(client.asClient(), TEST_TABLES),
			testStorage,
			new ApiGatewayChangeChannel(
				new DynamoConnectionRepository(client.asClient(), "connections"),
				pusher,
			),
			directory,
		),
		{ identity, media: { router: null }, realtime: { endpoint: null } },
	);
	let started: Promise<string> | undefined;
	const start = (): Promise<string> => {
		started ??= new Promise((resolve) => {
			const server = app.listen(0, "127.0.0.1", () => {
				resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
			});
			servers.push(server);
		});
		return started;
	};
	return async (request: ApiRequest): Promise<ApiReply> => {
		const response = await fetch(`${await start()}${request.path}`, {
			method: request.method,
			headers: request.headers,
			body: request.body,
		});
		const raw = await response.text();
		return {
			status: response.status,
			raw,
			headers: response.headers,
			body: raw === "" ? undefined : JSON.parse(raw),
		};
	};
}
