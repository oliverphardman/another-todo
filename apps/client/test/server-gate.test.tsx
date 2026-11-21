import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppConfigReader } from "../src/config/app-config";
import { ServerInfoLoader } from "../src/config/server-info";
import { ServerSession } from "../src/config/server-session";
import { ServerSettings } from "../src/config/server-settings";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { I18nProvider } from "../src/i18n/i18n-context";
import { ServerGate } from "../src/ui/server-gate";
import { ThemeProvider } from "../src/ui/theme-context";

afterEach(cleanup);

function setup(enforced: string | null, answer: () => Response | Promise<Response>) {
	const session = new ServerSession(
		AppConfigReader.read({}, undefined, undefined),
		new ServerSettings(new MemoryKeyValueStore(), enforced, async () => undefined),
		new ServerInfoLoader(async () => answer()),
	);
	render(
		<ThemeProvider scheme="light">
			<I18nProvider>
				<ServerGate session={session}>
					{(config) => <div>{`Connected to ${config.serverUrl}`}</div>}
				</ServerGate>
			</I18nProvider>
		</ThemeProvider>,
	);
	return session;
}

const ok = () => new Response(JSON.stringify({ authentication: "none" }), { status: 200 });
const down = () => new Response("{}", { status: 500 });

describe("ServerGate", () => {
	it("shows a loading screen until the server is known", async () => {
		setup(null, ok);
		expect(screen.getByText("Loading…")).toBeTruthy();
	});

	it("asks for the address, explains a bad one and connects to a good one", async () => {
		const session = setup(null, ok);
		await act(async () => session.start());
		fireEvent.change(screen.getByLabelText("Server address"), { target: { value: "ftp://x" } });
		fireEvent.click(screen.getByLabelText("Connect"));
		await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
		expect(screen.getByText(/Enter a valid web address/)).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Server address"), {
			target: { value: "todo.example.com" },
		});
		fireEvent.keyDown(screen.getByLabelText("Server address"), { key: "Enter" });
		fireEvent.submit(screen.getByLabelText("Server address"));
		await waitFor(() =>
			expect(screen.getByText("Connected to https://todo.example.com")).toBeTruthy(),
		);
	});

	it("lets people retry or change a server that cannot be reached", async () => {
		let up = false;
		const session = setup(null, () => (up ? ok() : down()));
		await act(async () => session.connect("todo.example.com"));
		expect(screen.getByText(/Could not reach https:\/\/todo.example.com/)).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Change server"));
		await waitFor(() => expect(screen.getByLabelText("Server address")).toBeTruthy());
		await act(async () => session.connect("todo.example.com"));
		up = true;
		fireEvent.click(screen.getByLabelText("Try again"));
		await waitFor(() =>
			expect(screen.getByText("Connected to https://todo.example.com")).toBeTruthy(),
		);
	});

	it("does not offer to change an enforced server", async () => {
		const session = setup("https://demo.example.com", down);
		await act(async () => session.start());
		expect(screen.getByText(/Could not reach https:\/\/demo.example.com/)).toBeTruthy();
		expect(screen.getByLabelText("Try again")).toBeTruthy();
		expect(screen.queryByLabelText("Change server")).toBeNull();
	});
});
