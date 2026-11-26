import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainer } from "../src/container";
import { renderApp } from "./support/render-app";
import { TEST_CONFIG } from "./support/test-container";

afterEach(cleanup);

async function start(authentication: "none" | "password" | "external", signIn = false) {
	return renderApp({ signedIn: signIn, config: { authentication } });
}

describe("sign-in with a username and password", () => {
	it("shows the fields and signs in with what was typed", async () => {
		const app = await start("password");
		const calls: unknown[] = [];
		app.authorizationServer.authorize = async (_provider, credentials) => {
			calls.push(credentials);
			return { accessToken: "t", refreshToken: null, expiresAt: Date.now() + 60_000 };
		};
		expect(screen.queryByLabelText("Continue with Microsoft")).toBeNull();
		fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
		fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Sign in"));
		});
		expect(calls).toEqual([{ username: "admin", password: "secret" }]);
		expect(app.container.auth.get()).toBe("signedIn");
	});

	it("opens with the same mark, name and prompt as the server screen", async () => {
		await start("password");
		expect(screen.getByRole("img", { name: "Another To Do" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Another To Do" })).toBeTruthy();
		expect(screen.getByText("Enter your username and password")).toBeTruthy();
		expect(screen.getByLabelText("Username").closest("[aria-hidden=true]")).toBeNull();
	});

	it("explains a refusal and signs in with the Enter key", async () => {
		const app = await start("password");
		app.authorizationServer.authorize = async () => {
			throw new Error("refused");
		};
		fireEvent.submit(screen.getByLabelText("Password"));
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Sign in"));
		});
		await waitFor(() =>
			expect(screen.getByText("The username or password is not correct.")).toBeTruthy(),
		);
		expect(app.container.auth.get()).toBe("signedOut");
	});
});

describe("sign-in on other servers", () => {
	it("offers the identity providers the server supports", async () => {
		await renderApp({
			signedIn: false,
			providers: ["Microsoft"],
			config: { authentication: "password" },
		});
		expect(screen.getByLabelText("Continue with Microsoft")).toBeTruthy();
		cleanup();
		await renderApp({ signedIn: false, config: { authentication: "password" } });
		expect(screen.queryByLabelText("Continue with Microsoft")).toBeNull();
	});
});

describe("changing server", () => {
	it("is offered at sign-in unless the server is enforced", async () => {
		const change = vi.fn(async () => undefined);
		await renderApp({
			signedIn: false,
			server: { enforced: false, change, logOut: vi.fn(async () => undefined) },
		});
		fireEvent.click(screen.getByLabelText("Change server"));
		expect(change).toHaveBeenCalledTimes(1);
		cleanup();
		await renderApp({
			signedIn: false,
			server: { enforced: true, change, logOut: vi.fn(async () => undefined) },
		});
		expect(screen.queryByLabelText("Change server")).toBeNull();
	});

	it("has no server to change by default", async () => {
		const container = createContainer(TEST_CONFIG, { platform: "web" });
		expect(container.server.enforced).toBe(true);
		await container.server.change();
	});
});
