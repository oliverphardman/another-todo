import { Router } from "express";
import { describe, expect, it } from "vitest";
import { Settings } from "../src/composition/env";
import type { Identity, Media, Realtime } from "../src/composition/platform";
import {
	PlatformFactory,
	ProviderDefaultsFor,
	ProviderRegistries,
} from "../src/composition/provider-registry";
import { AWS_DEFAULTS, awsProviders } from "../src/infrastructure/aws/aws-providers";
import { InMemoryDataStore } from "../src/infrastructure/memory/in-memory-data-store";
import {
	EnforcedAuthenticator,
	NoUserDirectory,
	enforced,
	sharedProviders,
} from "../src/infrastructure/shared/enforced-identity";
import { UnauthorizedError } from "../src/domain/errors";
import { BearerAuthenticator } from "../src/http/authenticator";
import { createTestApi, TokenIsSubjectAuthenticator } from "./support/test-api";
import { event } from "./support/events";

const AWS_ENV = {
	TABLE_NAME: "t",
	LISTS_TABLE_NAME: "l",
	SETTINGS_TABLE_NAME: "s",
	PHOTOS_TABLE_NAME: "p",
	GROUPS_TABLE_NAME: "g",
	SHARES_TABLE_NAME: "sh",
	PHOTOS_BUCKET: "bucket",
	CONNECTIONS_TABLE_NAME: "c",
	WEBSOCKET_MANAGEMENT_URL: "https://ws.example.com/prod",
	COGNITO_USER_POOL_ID: "eu-west-1_pool",
	COGNITO_CLIENT_ID: "client",
};

describe("Settings", () => {
	const settings = new Settings({ A: "1", B: " ", C: " x ", LIST: "a, ,b" });

	it("requires names and reports every one it was asked for", () => {
		expect(settings.require("A")).toEqual({ A: "1" });
		expect(() => settings.require("A", "MISSING")).toThrow("A, MISSING must be set");
	});

	it("reads trimmed optional values and lists", () => {
		expect(settings.optional("B")).toBeNull();
		expect(settings.optional("NONE")).toBeNull();
		expect(settings.optional("C")).toBe("x");
		expect(settings.list("LIST")).toEqual(["a", "b"]);
		expect(settings.list("NONE")).toEqual([]);
	});
});

describe("PlatformFactory", () => {
	const factory = new PlatformFactory(
		ProviderRegistries.merge(awsProviders, sharedProviders),
		ProviderDefaultsFor.withEnforcedUser(AWS_DEFAULTS),
	);

	it("builds the AWS providers by default", () => {
		const platform = factory.create(AWS_ENV, "https://api.example.com");
		expect(platform.identity.mode).toBe("external");
		expect(platform.identity.issuer).toBe(
			"https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_pool",
		);
		expect(platform.realtime.endpoint).toBe("wss://ws.example.com/prod");
		expect(platform.media.router).toBeNull();
		expect(platform.identity.router).toBeNull();
		expect(() => platform.realtime.attach({} as never)).not.toThrow();
	});

	it("swaps a provider through its environment variable", async () => {
		const platform = factory.create(
			{ ...AWS_ENV, AUTH_PROVIDER: "enforced", ENFORCED_USERNAME: "demo" },
			"https://api.example.com",
		);
		expect(platform.identity.mode).toBe("none");
		expect(await platform.identity.authenticator.authenticate({ header: () => undefined })).toBe(
			"demo",
		);
	});

	it("enforces the user whenever one is configured, unless another provider is named", async () => {
		const enforcedByDefault = factory.create(
			{ ...AWS_ENV, ENFORCED_USERNAME: "demo" },
			"https://api.example.com",
		);
		expect(enforcedByDefault.identity.mode).toBe("none");
		const named = factory.create(
			{ ...AWS_ENV, ENFORCED_USERNAME: "demo", AUTH_PROVIDER: "cognito" },
			"https://api.example.com",
		);
		expect(named.identity.mode).toBe("external");
		expect(factory.create({ ...AWS_ENV, ENFORCED_USERNAME: " " }, "u").identity.mode).toBe(
			"external",
		);
	});

	it("names the choices when a provider is unknown", () => {
		expect(() => factory.create({ ...AWS_ENV, DATA_PROVIDER: "mongo" }, "u")).toThrow(
			"DATA_PROVIDER must be one of dynamodb (got mongo)",
		);
	});

	it("requires the settings of the chosen provider only", () => {
		expect(() => factory.create({ ...AWS_ENV, AUTH_PROVIDER: "enforced" }, "u")).toThrow(
			"ENFORCED_USERNAME must be set",
		);
		expect(() => factory.create({ ...AWS_ENV, TABLE_NAME: "" }, "u")).toThrow("must be set");
		expect(() => factory.create({ ...AWS_ENV, PHOTOS_BUCKET: "" }, "u")).toThrow("must be set");
		expect(() => factory.create({ ...AWS_ENV, WEBSOCKET_MANAGEMENT_URL: "" }, "u")).toThrow(
			"must be set",
		);
		expect(() => factory.create({ ...AWS_ENV, COGNITO_CLIENT_ID: "" }, "u")).toThrow("must be set");
	});
});

describe("enforced identity", () => {
	it("authenticates every request as the one user and knows nobody else", async () => {
		const identity = enforced({ ENFORCED_USERNAME: "admin" });
		expect(await identity.authenticator.authenticate({ header: () => undefined })).toBe("admin");
		expect(await new EnforcedAuthenticator("x").authenticate()).toBe("x");
		expect(await new NoUserDirectory().findByEmail()).toBeNull();
	});
});

describe("InMemoryDataStore", () => {
	it("provides an independent repository per aggregate", async () => {
		const store = new InMemoryDataStore();
		expect(await store.tasks.list("u")).toEqual([]);
		expect(await store.lists.list("u")).toEqual([]);
		expect(await store.groups.list("u")).toEqual([]);
		expect(await store.shares.list("u")).toEqual([]);
		expect(await store.photos.list("u")).toEqual([]);
		expect(await store.settings.list("u")).toEqual([]);
	});
});

describe("public configuration", () => {
	it("tells clients how to authenticate and what notice to show", async () => {
		const api = createTestApi();
		const reply = await api(event({ path: "/config" }));
		expect(reply.body).toEqual({ authentication: "external", notice: null, realtimeUrl: null });
	});
});

describe("BearerAuthenticator over credentials", () => {
	it("works with anything that can read a header", async () => {
		const authenticator = new BearerAuthenticator({ verify: async () => ({ sub: "u" }) });
		expect(await authenticator.authenticate({ header: () => "Bearer t" })).toBe("u");
		await expect(authenticator.authenticate({ header: () => undefined })).rejects.toThrow(
			UnauthorizedError,
		);
		expect(
			await new TokenIsSubjectAuthenticator().authenticate({ header: () => "Bearer abc" }),
		).toBe("abc");
	});
});

describe("mounted provider routers", () => {
	it("serves the routes a provider contributes", async () => {
		const { createApp, createServices } = await import("../src/bootstrap");
		const { TEST_CONFIG, TEST_ISSUER } = await import("./support/test-api");
		const { FakeMediaStorage } = await import("./support/fake-media-storage");
		const { FakeUserDirectory } = await import("./support/fake-user-directory");
		const identityRouter = Router();
		identityRouter.get("/from-identity", (_request, response) => {
			response.json({ ok: "identity" });
		});
		const mediaRouter = Router();
		mediaRouter.get("/from-media", (_request, response) => {
			response.json({ ok: "media" });
		});
		const identity: Identity = {
			mode: "password",
			authenticator: new TokenIsSubjectAuthenticator(),
			directory: new FakeUserDirectory(),
			issuer: null,
			router: identityRouter,
		};
		const media: Pick<Media, "router"> = { router: mediaRouter };
		const data = new InMemoryDataStore();
		const realtime: Realtime = {
			channel: { deliver: async () => undefined },
			endpoint: "wss://rt.example.com/dev",
			attach: () => {},
		};
		const app = createApp(
			{ ...TEST_CONFIG, notice: "Shared" },
			createServices(data, new FakeMediaStorage(), realtime.channel, identity.directory),
			{ identity, media, realtime },
		);
		const server = app.listen(0, "127.0.0.1");
		await new Promise((resolve) => server.once("listening", resolve));
		const { port } = server.address() as { port: number };
		const base = `http://127.0.0.1:${port}`;
		expect(await (await fetch(`${base}/from-identity`)).json()).toEqual({ ok: "identity" });
		expect(await (await fetch(`${base}/from-media`)).json()).toEqual({ ok: "media" });
		expect(await (await fetch(`${base}/config`)).json()).toEqual({
			authentication: "password",
			notice: "Shared",
			realtimeUrl: "wss://rt.example.com/dev",
		});
		const discovery = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json();
		expect(discovery.authorization_servers).toEqual([TEST_CONFIG.publicUrl]);
		await new Promise((resolve) => server.close(resolve));
		expect(TEST_ISSUER).toBeTruthy();
	});
});
