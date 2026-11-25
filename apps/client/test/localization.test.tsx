import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EN_US, type MessageKey, type Messages } from "../src/i18n/en-us";
import { CATALOGS } from "../src/i18n/locales";
import { AppConfigReader } from "../src/config/app-config";
import { ServerInfoLoader } from "../src/config/server-info";
import { ServerSession } from "../src/config/server-session";
import { ServerSettings } from "../src/config/server-settings";
import { I18nProvider } from "../src/i18n/i18n-context";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { ServerGate } from "../src/ui/server-gate";
import { ThemeProvider } from "../src/ui/theme-context";
import { renderApp } from "./support/render-app";

const PSEUDO = "pseudo";
const catalogs = CATALOGS as Record<string, Messages>;
catalogs[PSEUDO] = Object.fromEntries(
	Object.entries(EN_US).map(([key, value]) => [key, `«${value}»`]),
) as Messages;

const PHRASES = [...new Set(Object.values(EN_US).flatMap((value) => value.split(/\{\w+\}/)))]
	.map((phrase) => phrase.trim())
	.filter((phrase) => phrase.length >= 3);

type Params = Record<string, string | number>;

const pseudo = (key: MessageKey, params: Params = {}): string =>
	`«${EN_US[key].replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]))}»`;

const byLabel = (key: MessageKey, params?: Params) => screen.getByLabelText(pseudo(key, params));

const byText = (key: MessageKey, params?: Params) => screen.getByText(pseudo(key, params));

function unlocalized(): string[] {
	const texts: string[] = [];
	for (const element of Array.from(document.body.querySelectorAll("*"))) {
		for (const node of Array.from(element.childNodes)) {
			if (node.nodeType === 3) {
				texts.push(node.textContent ?? "");
			}
		}
		for (const name of ["aria-label", "placeholder"]) {
			texts.push(element.getAttribute(name) ?? "");
		}
	}
	const strip = (text: string): string => {
		let result = text;
		while (/«[^«»]*»/.test(result)) {
			result = result.replace(/«[^«»]*»/g, "");
		}
		return result.trim();
	};
	return texts.map(strip).filter((text) => PHRASES.some((phrase) => text.includes(phrase)));
}

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp({ locale: PSEUDO, ...options });
	stop = app.stop;
	return app;
}

function addTask(title: string): void {
	const input = byLabel("task.add");
	fireEvent.change(input, { target: { value: title } });
	fireEvent.keyDown(input, { key: "Enter" });
}

describe("every user-visible string comes from the message catalog", () => {
	it("has a pseudo catalog that covers the whole real one", () => {
		expect(PHRASES.length).toBeGreaterThan(100);
		expect(Object.keys(catalogs[PSEUDO]!)).toEqual(Object.keys(EN_US));
	});

	it("the sign-in screen", async () => {
		await start({ signedIn: false, providers: ["Microsoft"] });
		expect(screen.getByText("«Another To Do»")).toBeTruthy();
		byText("app.tagline");
		byLabel("signIn.provider", { provider: "Microsoft" });
		expect(unlocalized()).toEqual([]);
	});

	it("the username and password sign-in, the notice and changing server", async () => {
		await start({
			signedIn: false,
			config: { authentication: "password" },
			server: {
				enforced: false,
				change: async () => undefined,
				logOut: async () => undefined,
			},
		});
		byLabel("signIn.username");
		byLabel("signIn.password");
		byLabel("server.change");
		fireEvent.submit(byLabel("signIn.password"));
		expect(unlocalized()).toEqual([]);
	});

	it("the notice banner", async () => {
		await start({ config: { notice: "Public demo" } });
		byLabel("notice.dismiss");
		expect(unlocalized()).toEqual([]);
	});

	it("the server address prompt and its errors", async () => {
		const session = new ServerSession(
			AppConfigReader.read({}, undefined, undefined),
			new ServerSettings(new MemoryKeyValueStore(), null, async () => undefined),
			new ServerInfoLoader(async () => new Response("{}", { status: 500 })),
		);
		render(
			<ThemeProvider scheme="light">
				<I18nProvider locale={PSEUDO}>
					<ServerGate session={session}>{() => null}</ServerGate>
				</I18nProvider>
			</ThemeProvider>,
		);
		await act(async () => session.start());
		byText("server.prompt");
		byLabel("server.connect");
		fireEvent.change(byLabel("server.label"), { target: { value: "ftp://x" } });
		await act(async () => {
			fireEvent.click(byLabel("server.connect"));
		});
		byText("server.invalid");
		expect(unlocalized()).toEqual([]);
		await act(async () => session.connect("todo.example.com"));
		byText("server.unreachable", { url: "https://todo.example.com" });
		byLabel("server.retry");
		expect(unlocalized()).toEqual([]);
	});

	it("the sidebar, task list, task rows and completed section", async () => {
		await start();
		expect(unlocalized()).toEqual([]);
		addTask("Zebra");
		addTask("Quokka");
		fireEvent.click(screen.getAllByLabelText(pseudo("task.complete"))[0]!);
		byText("list.completed", { count: 1 });
		expect(
			screen.getAllByLabelText(pseudo("sidebar.openCount", { count: 1 })).length,
		).toBeGreaterThan(0);
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("list.hideCompletedSection"));
		expect(unlocalized()).toEqual([]);
	});

	it("the details pane with steps, due dates, notes and the created line", async () => {
		await start();
		addTask("Zebra");
		fireEvent.click(byLabel("task.open", { title: "Zebra" }));
		byText("task.created", { when: pseudo("created.fewMoments") });
		fireEvent.click(byLabel("step.add"));
		const step = byLabel("step.new");
		fireEvent.change(step, { target: { value: "Gnu" } });
		fireEvent.keyDown(step, { key: "Enter" });
		fireEvent.keyDown(step, { key: "Escape" });
		byLabel("step.named", { title: "Gnu" });
		byLabel("step.options", { title: "Gnu" });
		byLabel("step.complete", { title: "Gnu" });
		fireEvent.click(byLabel("step.complete", { title: "Gnu" }));
		byLabel("step.uncomplete", { title: "Gnu" });
		fireEvent.click(byLabel("detail.addDue"));
		byLabel("due.options");
		byLabel("due.option", { label: pseudo("due.today") });
		byLabel("due.custom");
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("due.option", { label: pseudo("due.tomorrow") }));
		byLabel("detail.due", { when: pseudo("due.tomorrow") });
		fireEvent.click(byLabel("detail.due", { when: pseudo("due.tomorrow") }));
		byLabel("due.remove");
		fireEvent.click(byLabel("task.closeDetails"));
		expect(
			screen.getByText(new RegExp(pseudo("task.stepsProgress", { done: 1, total: 1 }))),
		).toBeTruthy();
		expect(unlocalized()).toEqual([]);
	});

	it("the list options menu, sort, theme panel and photos", async () => {
		const app = await start();
		addTask("Zebra");
		fireEvent.click(byLabel("list.options"));
		fireEvent.click(byLabel("menu.sort"));
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("sort.alphabetical"));
		fireEvent.click(byLabel("list.options"));
		fireEvent.click(byLabel("menu.hideCompleted"));
		fireEvent.click(byLabel("list.options"));
		byLabel("menu.showCompleted");
		fireEvent.click(byLabel("menu.theme"));
		byText("theme.title");
		byText("theme.colors");
		byText("theme.photos");
		byLabel("theme.named", { name: pseudo("color.periwinkle") });
		await act(async () => {
			fireEvent.click(byLabel("photo.uploadA11y"));
		});
		await screen.findByLabelText(pseudo("photo.use", { name: "beach.png" }));
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("photo.delete", { name: "beach.png" }));
		byText("photo.confirm", { name: "beach.png" });
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("photo.cancelDelete"));
		app.photoPicker.next = {
			name: "x.gif",
			contentType: "image/gif",
			size: 5,
			body: new Blob(["x"]),
		};
		await act(async () => {
			fireEvent.click(byLabel("photo.uploadA11y"));
		});
		await screen.findByText(pseudo("photo.errorType"));
		app.photoGateway.failure = new Error("offline");
		app.photoPicker.next = {
			name: "y.png",
			contentType: "image/png",
			size: 5,
			body: new Blob(["x"]),
		};
		await act(async () => {
			fireEvent.click(byLabel("photo.uploadA11y"));
		});
		await screen.findByText(pseudo("photo.errorUnavailable"));
		expect(unlocalized()).toEqual([]);
	});

	it("new lists, duplicate and the rename controls", async () => {
		await start();
		fireEvent.click(byLabel("sidebar.createList"));
		const field = screen.getByPlaceholderText(pseudo("sidebar.newList"));
		fireEvent.change(field, { target: { value: "Okapi" } });
		fireEvent.keyDown(field, { key: "Enter" });
		byLabel("list.renameHint");
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("list.options"));
		byLabel("ctx.renameList");
		byLabel("ctx.deleteList");
		byLabel("menu.duplicate");
		fireEvent.click(byLabel("menu.duplicate"));
		expect(
			screen.getByRole("heading", { name: pseudo("list.copyOf", { name: "Okapi" }) }),
		).toBeTruthy();
		expect(unlocalized()).toEqual([]);
	});

	it("the sync messages", async () => {
		const rejecting = await start({
			respond: (method) =>
				method === "POST"
					? new Response(JSON.stringify({ error: "invalid" }), { status: 400 })
					: new Response(JSON.stringify({ tasks: [], lists: [], groups: [], settings: [] }), {
							status: 200,
						}),
		});
		await waitFor(() => expect(rejecting.container.sync.get().phase).toBe("idle"));
		addTask("Zebra");
		await waitFor(() => byText("sync.rejected_one" as MessageKey, { count: 1 }));
		fireEvent.click(byLabel("sync.dismiss"));
		cleanup();
		const expired = await start({
			respond: () => new Response(JSON.stringify({ error: "expired" }), { status: 401 }),
		});
		await waitFor(() => byText("signIn.expired"));
		byLabel("signIn.again");
		expect(unlocalized()).toEqual([]);
		expect(expired.container.sync.get().phase).toBe("unauthorized");
		cleanup();
		const offline = await start();
		await act(async () => {
			offline.connectivity.setOnline(false);
		});
		addTask("Zebra");
		byLabel("sync.waiting");
		expect(unlocalized()).toEqual([]);
	});

	it("the task context menu", async () => {
		await start();
		addTask("Zebra");
		fireEvent.contextMenu(byLabel("task.open", { title: "Zebra" }), { clientX: 50, clientY: 50 });
		byLabel("ctx.removeFromMyDay");
		byLabel("ctx.markImportant");
		byLabel("ctx.markCompleted");
		byLabel("ctx.dueToday");
		byLabel("ctx.dueTomorrow");
		byLabel("ctx.pickDate");
		byLabel("ctx.createList");
		byLabel("ctx.deleteTask");
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("ctx.moveTo"));
		byLabel("menu.back");
		expect(unlocalized()).toEqual([]);
	});

	it("search, groups, sharing and the step menu", async () => {
		const app = await start();
		byLabel("sidebar.search");
		const field = byLabel("sidebar.search");
		fireEvent.change(field, { target: { value: "zz" } });
		byLabel("sidebar.clearSearch");
		byText("view.search");
		fireEvent.click(byLabel("sidebar.clearSearch"));
		act(() => {
			app.container.store.addList("Okapi");
			app.container.store.select("my-day");
		});
		fireEvent.contextMenu(screen.getByLabelText("Okapi"));
		byLabel("ctx.createGroup");
		byLabel("ctx.moveToGroup");
		fireEvent.click(byLabel("ctx.shareList"));
		byLabel("share.title");
		byLabel("share.email");
		byLabel("share.add");
		await screen.findByText(pseudo("share.empty"));
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("share.close"));
		fireEvent.contextMenu(screen.getByLabelText("Okapi"));
		fireEvent.click(byLabel("ctx.createGroup"));
		fireEvent.keyDown(byLabel("group.name"), { key: "Enter" });
		byLabel("group.header", { name: pseudo("group.new") });
		expect(unlocalized()).toEqual([]);
		fireEvent.contextMenu(byLabel("group.header", { name: pseudo("group.new") }));
		byLabel("ctx.renameGroup");
		byLabel("ctx.ungroup");
		fireEvent.click(byLabel("ctx.ungroup"));
		act(() => {
			app.container.store.select("my-day");
		});
		addTask("Zebra");
		fireEvent.click(byLabel("task.open", { title: "Zebra" }));
		fireEvent.click(byLabel("step.add"));
		const step = byLabel("step.new");
		fireEvent.change(step, { target: { value: "Gnu" } });
		fireEvent.keyDown(step, { key: "Enter" });
		fireEvent.keyDown(step, { key: "Escape" });
		fireEvent.click(byLabel("step.options", { title: "Gnu" }));
		screen.getByLabelText(pseudo("step.markCompleted"), { selector: "[role=menuitem]" });
		byLabel("step.promote");
		byLabel("step.deleteStep");
		expect(unlocalized()).toEqual([]);
	});

	it("the narrow layout", async () => {
		await start({ width: 400 });
		byLabel("list.showLists");
		fireEvent.click(byLabel("list.options"));
		fireEvent.click(byLabel("menu.sort"));
		byLabel("menu.back");
		expect(unlocalized()).toEqual([]);
		fireEvent.click(byLabel("menu.back"));
		fireEvent.click(byLabel("menu.close"));
		fireEvent.click(byLabel("list.showLists"));
		byLabel("sidebar.lists");
		byLabel("signOut.button");
		byText("view.important");
		expect(unlocalized()).toEqual([]);
	});

	it("the loading state", async () => {
		await start({ signedIn: false, restore: false });
		byText("app.loading");
		expect(unlocalized()).toEqual([]);
	});
});

describe("localized dates", () => {
	it("shows British date order for en-GB and capitalizes only the word Created", async () => {
		await renderApp({ locale: "en-GB" }).then((app) => {
			stop = app.stop;
		});
		expect(screen.getByText("Thursday 19 November")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("List options"));
		fireEvent.click(screen.getByLabelText("Change Theme…"));
		expect(screen.getByText("Colours")).toBeTruthy();
		expect(screen.getByLabelText("Grey theme")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Close theme"));
		const input = screen.getByLabelText("Add a task");
		fireEvent.change(input, { target: { value: "Quokka" } });
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("Open Quokka"));
		expect(screen.getByText("Created a few moments ago")).toBeTruthy();
	});

	it("falls back to en-US for locales without a catalog", async () => {
		await renderApp({ locale: "fr-FR" }).then((app) => {
			stop = app.stop;
		});
		expect(screen.getByText("Thursday, November 19")).toBeTruthy();
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
	});
});
