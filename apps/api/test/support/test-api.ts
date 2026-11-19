import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Request } from "express";
import { afterAll } from "vitest";
import { createApp, createServices, type ApiConfig } from "../../src/bootstrap";
import { UnauthorizedError } from "../../src/domain/errors";
import type { Authenticator } from "../../src/http/authenticator";
import { FakeDocumentClient } from "./fake-document-client";
import { FakePhotoStorage } from "./fake-photo-storage";
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
	tableName: "tasks",
	listsTableName: "lists",
	settingsTableName: "settings",
	photosTableName: "photos",
	photosBucket: "photos-bucket",
	userPoolId: "eu-west-1_test",
	clientId: "client",
	publicUrl: "https://api.example.com",
	corsOrigins: [TEST_ORIGIN],
};

export class TokenIsSubjectAuthenticator implements Authenticator {
	async authenticate(request: Request): Promise<string> {
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

export const testStorage = new FakePhotoStorage();

export function createTestApi(
	client: { asClient(): DynamoDBDocumentClient } = new FakeDocumentClient(2),
) {
	const app = createApp(
		TEST_CONFIG,
		createServices(TEST_CONFIG, client.asClient(), testStorage),
		new TokenIsSubjectAuthenticator(),
		TEST_ISSUER,
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
