import { act, render } from "@testing-library/react";
import { AppShell } from "../../src/ui/app-shell";
import { ContainerProvider } from "../../src/ui/container-context";
import { ThemeProvider } from "../../src/ui/theme-context";
import { createTestContainer, type TestContainer } from "./test-container";
import type { IdentityProvider } from "../../src/auth/authorization-server";

export function setViewport(width: number): void {
	Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
	Object.defineProperty(document.documentElement, "clientWidth", {
		configurable: true,
		value: width,
	});
	window.dispatchEvent(new Event("resize"));
}

export interface RenderOptions {
	readonly width?: number;
	readonly signedIn?: boolean;
	readonly restore?: boolean;
	readonly scheme?: "light" | "dark";
	readonly providers?: readonly IdentityProvider[];
	readonly respond?: (method: string, url: string, body: unknown) => Response | Promise<Response>;
}

export async function renderApp(options: RenderOptions = {}) {
	setViewport(options.width ?? 1280);
	const test = createTestContainer(options.respond);
	if (options.signedIn !== false) {
		await test.container.auth.signIn();
	} else if (options.restore !== false) {
		await test.container.auth.restore();
	}
	const view = render(
		<ThemeProvider scheme={options.scheme ?? "light"}>
			<ContainerProvider container={test.container}>
				<AppShell providers={options.providers ?? []} />
			</ContainerProvider>
		</ThemeProvider>,
	);
	await act(async () => {
		test.container.sync.start();
	});
	return { ...view, ...test, stop: () => test.container.sync.stop() } as ReturnType<typeof render> &
		TestContainer & { stop: () => void };
}
