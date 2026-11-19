import { act, render } from "@testing-library/react";
import { I18nProvider } from "../../src/i18n/i18n-context";
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
	readonly locale?: string;
	readonly saved?: Readonly<Record<string, string>>;
	readonly providers?: readonly IdentityProvider[];
	readonly respond?: (method: string, url: string, body: unknown) => Response | Promise<Response>;
}

export async function renderApp(options: RenderOptions = {}) {
	setViewport(options.width ?? 1280);
	const test = createTestContainer(options.respond);
	for (const [key, value] of Object.entries(options.saved ?? {})) {
		await test.dataStore.set(key, value);
	}
	await test.container.paneWidths.load();
	if (options.signedIn !== false) {
		await test.container.auth.signIn();
	} else if (options.restore !== false) {
		await test.container.auth.restore();
	}
	const view = render(
		<ThemeProvider scheme={options.scheme ?? "light"}>
			<I18nProvider locale={options.locale}>
				<ContainerProvider container={test.container}>
					<AppShell providers={options.providers ?? []} />
				</ContainerProvider>
			</I18nProvider>
		</ThemeProvider>,
	);
	await act(async () => {
		test.container.sync.start();
	});
	return { ...view, ...test, stop: () => test.container.sync.stop() } as ReturnType<typeof render> &
		TestContainer & { stop: () => void };
}
