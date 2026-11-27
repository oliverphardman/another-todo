import { act, render } from "@testing-library/react";
import { I18nProvider } from "../../src/i18n/i18n-context";
import type { Motion } from "../../src/ui/motion";
import { AppShell } from "../../src/ui/app-shell";
import { ContainerProvider } from "../../src/ui/container-context";
import { ThemeProvider } from "../../src/ui/theme-context";
import { createTestContainer, type TestContainer } from "./test-container";
import type { AppConfig } from "../../src/config/app-config";
import type { ServerControls } from "../../src/config/server-session";
import type { IdentityProvider } from "../../src/auth/authorization-server";

export function setViewport(width: number, height = 768): void {
	Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
	Object.defineProperty(document.documentElement, "clientWidth", {
		configurable: true,
		value: width,
	});
	Object.defineProperty(document.documentElement, "clientHeight", {
		configurable: true,
		value: height,
	});
	window.dispatchEvent(new Event("resize"));
}

export interface RenderOptions {
	readonly width?: number;
	readonly platform?: string;
	readonly signedIn?: boolean;
	readonly restore?: boolean;
	readonly scheme?: "light" | "dark";
	readonly locale?: string;
	readonly motion?: Motion;
	readonly accessToken?: string;
	readonly microsoftAvailable?: boolean;
	readonly config?: Partial<AppConfig>;
	readonly server?: ServerControls;
	readonly saved?: Readonly<Record<string, string>>;
	readonly providers?: readonly IdentityProvider[];
	readonly respond?: (method: string, url: string, body: unknown) => Response | Promise<Response>;
}

export async function renderApp(options: RenderOptions = {}) {
	setViewport(options.width ?? 1280);
	const test = createTestContainer(
		options.respond,
		options.motion,
		options.microsoftAvailable,
		options.config,
		options.server,
		options.platform,
	);
	for (const [key, value] of Object.entries(options.saved ?? {})) {
		await test.dataStore.set(key, value);
	}
	await test.container.paneWidths.load();
	await test.container.settings.load();
	if (options.accessToken !== undefined) {
		test.authorizationServer.authorizeResult = {
			accessToken: options.accessToken,
			refreshToken: "refresh-1",
			expiresAt: Date.now() + 3_600_000,
		};
	}
	const unwatchMicrosoft = test.container.microsoft.watch();
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
	return {
		...view,
		...test,
		stop: () => {
			test.container.sync.stop();
			unwatchMicrosoft();
			test.container.microsoft.stop();
		},
	} as ReturnType<typeof render> & TestContainer & { stop: () => void };
}
