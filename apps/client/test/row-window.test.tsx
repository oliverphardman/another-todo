import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Animated } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Task } from "../src/domain/task";
import { RowWindow } from "../src/ui/row-window";
import { renderApp, setViewport } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	vi.restoreAllMocks();
});

type Handlers = HTMLElement & {
	__reactLayoutHandler?: (event: { nativeEvent: { layout: { height: number } } }) => void;
};

const PAGE = Math.ceil(768 / 54) + 2;

async function start(count = 100, motion = { fillMs: 0, travelMs: 0, slideMs: 0 }) {
	const app = await renderApp({ motion });
	stop = app.stop;
	const { store } = app.container;
	act(() => app.connectivity.setOnline(false));
	await act(async () => {
		for (const list of ["Work", "Home"]) {
			store.addList(list);
			const id = store.get().lists.find((candidate) => candidate.name === list)!.id;
			store.select(id);
			for (let index = 0; index < count; index++) {
				app.clock.advance(1000);
				store.addTask(`${list} ${index}`);
			}
		}
	});
	const open = async (name: string) => {
		await act(async () => {
			fireEvent.click(screen.getByLabelText(name));
		});
	};
	await open("Work");
	return { app, open };
}

const titles = () =>
	screen.queryAllByLabelText(/^Open /).map((row) => row.getAttribute("aria-label")!.slice(5));

function scroller(): HTMLElement {
	let element = screen.getByLabelText("Task list background").parentElement!;
	while (getComputedStyle(element).overflowY !== "auto") {
		element = element.parentElement!;
	}
	return element;
}

async function scrollTo(top: number, height = 600) {
	const element = scroller();
	Object.defineProperties(element, {
		scrollTop: { configurable: true, writable: true, value: top },
		scrollHeight: { configurable: true, get: () => titles().length * 54 },
		offsetHeight: { configurable: true, value: height },
	});
	await act(async () => {
		fireEvent.scroll(element);
	});
}

describe("a long list", () => {
	it("builds only the first screenful, however many tasks it holds", async () => {
		await start(300);
		expect(titles()).toHaveLength(PAGE);
		expect(titles()[0]).toBe("Work 299");
	});

	it("adds a screenful when scrolling nears the end", async () => {
		await start();
		await scrollTo(300);
		expect(titles()).toHaveLength(2 * PAGE);
	});

	it("adds nothing while there is still plenty below", async () => {
		await start();
		await scrollTo(1, 100);
		expect(titles()).toHaveLength(PAGE);
	});

	it("adds nothing for a scroll that is still at the top", async () => {
		await start();
		await scrollTo(0);
		expect(titles()).toHaveLength(PAGE);
	});

	it("stops adding once everything is shown", async () => {
		await start(20);
		await scrollTo(300);
		await scrollTo(600);
		expect(titles()).toHaveLength(20);
	});

	it("starts again from the top when another list is opened", async () => {
		const { open } = await start();
		await scrollTo(300);
		const element = scroller();
		const scrolled = vi.fn(() => {
			element.scrollTop = 0;
		});
		element.scroll = scrolled;
		await open("Home");
		expect(titles()).toHaveLength(PAGE);
		expect(titles()[0]).toBe("Home 99");
		expect(scrolled).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
		await open("Work");
		expect(titles()).toHaveLength(PAGE);
	});

	it("sizes the screenful by the space the list actually has", async () => {
		await start();
		let element: Handlers = scroller() as Handlers;
		while (element.__reactLayoutHandler === undefined) {
			element = element.parentElement as Handlers;
		}
		await act(async () => {
			element.__reactLayoutHandler!({ nativeEvent: { layout: { height: 270 } } });
		});
		expect(titles()).toHaveLength(7);
	});

	it("grows the screenful with the window", async () => {
		await start();
		await act(async () => setViewport(1280, 1080));
		expect(titles()).toHaveLength(22);
	});

	it("does not treat completed tasks arriving together as ones that moved", async () => {
		const { app } = await start(3);
		const { store } = app.container;
		const work = store.get().lists.find((list) => list.name === "Work")!.id;
		await act(async () => {
			for (let index = 0; index < 60; index++) {
				const task = Task.create(`done-${index}`, `Done ${index}`, "2026-01-01T00:00:00Z", work);
				store.importTask(task.with({ completed: true }));
			}
		});
		expect(titles().length).toBeLessThan(PAGE);
	});

	it("keeps a task that has just been completed, so it can glide away", async () => {
		vi.spyOn(Animated, "timing").mockImplementation(
			(value, config) =>
				({
					start: () => (value as Animated.Value).setValue(config.toValue as number),
				}) as unknown as Animated.CompositeAnimation,
		);
		await start(100, { fillMs: 100, travelMs: 200, slideMs: 0 });
		await act(async () => {
			fireEvent.click(screen.getAllByLabelText("Mark as completed")[0]!);
		});
		expect(titles()).toContain("Work 99");
		expect(titles()).toHaveLength(PAGE + 1);
	});
});

describe("rows reused between lists", () => {
	it("show the new task's state rather than the last one's", async () => {
		const { app, open } = await start(3);
		const { store } = app.container;
		await act(async () => {
			for (const task of store.get().tasks.filter((task) => task.title.startsWith("Work"))) {
				store.toggleCompleted(task.id);
			}
		});
		const row = screen.getByLabelText("Open Work 2");
		expect(screen.getAllByLabelText("Mark as not completed")).toHaveLength(3);
		await open("Home");
		expect(screen.queryAllByLabelText("Mark as not completed")).toHaveLength(0);
		expect(screen.getAllByLabelText("Mark as completed")).toHaveLength(3);
		expect(row.isConnected).toBe(true);
	});
});

describe("RowWindow", () => {
	it("covers a height with whole rows and a little to spare", () => {
		expect(RowWindow.covering(540, 54).pageSize).toBe(12);
		expect(RowWindow.covering(541, 54).pageSize).toBe(13);
	});
});
