import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const expo = vi.hoisted(() => ({ registerRootComponent: vi.fn() }));
const browser = vi.hoisted(() => ({ maybeCompleteAuthSession: vi.fn() }));

vi.mock("expo", () => expo);
vi.mock("expo-web-browser", () => browser);
import App from "../App";
import { setViewport } from "./support/render-app";

const serverAnswer = (authentication: string) =>
	vi.fn(async (url: string) =>
		url.endsWith("/config")
			? new Response(JSON.stringify({ authentication, notice: null, realtimeUrl: null }), {
					status: 200,
				})
			: new Response(JSON.stringify({ tasks: [], lists: [], groups: [], settings: [] }), {
					status: 200,
				}),
	);

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("App", () => {
	beforeEach(() => {
		setViewport(1280);
	});

	it("asks for the server at first start, then shows the sign-in screen it offers", async () => {
		vi.stubGlobal("fetch", serverAnswer("external"));
		const { unmount } = render(<App />);
		await waitFor(() => expect(screen.getByLabelText("Server address")).toBeTruthy());
		fireEvent.change(screen.getByLabelText("Server address"), {
			target: { value: "todo.example.com" },
		});
		fireEvent.click(screen.getByLabelText("Connect"));
		await waitFor(() => expect(screen.getByLabelText("Sign in")).toBeTruthy());
		expect(screen.getByLabelText("Continue with Microsoft")).toBeTruthy();
		expect(screen.getByLabelText("Change server")).toBeTruthy();
		expect(screen.getAllByTestId("status-bar")[0]!.dataset.tone).toBe("auto");
		unmount();
	});

	it("skips the prompt and sign-in on a server it is locked to with authentication disabled", async () => {
		vi.stubEnv("EXPO_PUBLIC_ENFORCED_SERVER_URL", "https://demo.example.com");
		vi.stubGlobal("fetch", serverAnswer("none"));
		const { unmount } = render(<App />);
		await waitFor(() => expect(screen.getByLabelText("Add a task")).toBeTruthy());
		expect(screen.queryByLabelText("Server address")).toBeNull();
		expect(screen.queryByLabelText("Sign in")).toBeNull();
		unmount();
	});
});

describe("day rollover", () => {
	it("keeps checking whether the day has changed while the app is open", async () => {
		vi.stubEnv("EXPO_PUBLIC_ENFORCED_SERVER_URL", "https://demo.example.com");
		vi.stubGlobal("fetch", serverAnswer("none"));
		const timers = vi.spyOn(globalThis, "setInterval");
		const { unmount } = render(<App />);
		await waitFor(() => expect(screen.getByLabelText("Add a task")).toBeTruthy());
		act(() => {
			for (const [callback, delay] of timers.mock.calls) {
				if (delay === 60_000) {
					(callback as () => void)();
				}
			}
		});
		timers.mockRestore();
		unmount();
	});
});

describe("entry point", () => {
	it("completes pending auth sessions and registers the root component", async () => {
		await import("../index");
		expect(browser.maybeCompleteAuthSession).toHaveBeenCalledTimes(1);
		expect(expo.registerRootComponent).toHaveBeenCalledWith(App);
	});
});
