import { render, screen, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const expo = vi.hoisted(() => ({ registerRootComponent: vi.fn() }));
const browser = vi.hoisted(() => ({ maybeCompleteAuthSession: vi.fn() }));

vi.mock("expo", () => expo);
vi.mock("expo-web-browser", () => browser);
vi.mock("react-native-safe-area-context", () => ({
	SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("expo-status-bar", () => ({ StatusBar: () => <div data-testid="status-bar" /> }));

import App from "../App";
import { setViewport } from "./support/render-app";

describe("App", () => {
	beforeEach(() => {
		setViewport(1280);
	});

	it("composes the container and shows the sign-in screen for a new user", async () => {
		const { unmount } = render(<App />);
		await waitFor(() => expect(screen.getByLabelText("Sign in")).toBeTruthy());
		expect(screen.getByLabelText("Continue with Microsoft")).toBeTruthy();
		expect(screen.getByTestId("status-bar")).toBeTruthy();
		unmount();
	});
});

describe("day rollover", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("keeps checking whether the day has changed while the app is open", async () => {
		const { unmount } = render(<App />);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(120_000);
		});
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
