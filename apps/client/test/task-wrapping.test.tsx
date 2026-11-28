import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

describe("long task text", () => {
	it("wraps the title and the details under it instead of widening the row", async () => {
		const app = await renderApp();
		stop = app.stop;
		act(() => app.connectivity.setOnline(false));
		const title = "unbroken".repeat(40);
		const list = "Long list name ".repeat(20).trim();
		act(() => {
			app.container.store.addList(list);
		});
		act(() => {
			app.container.store.select(app.container.store.get().lists.at(-1)!.id);
			app.container.store.addTask(title);
		});
		act(() => {
			app.container.store.toggleImportant(app.container.store.get().tasks[0]!.id);
			app.container.store.select("important");
		});
		const row = screen.getByLabelText(`Open ${title}`);
		const heading = Array.from(row.querySelectorAll("div")).find(
			(node) => node.textContent === title,
		)!;
		expect(getComputedStyle(heading).whiteSpace).not.toBe("nowrap");
		expect(getComputedStyle(heading).wordWrap).toBe("break-word");
		const detail = Array.from(row.querySelectorAll("div"))
			.filter((node) => node.textContent === list)
			.at(-1)!;
		expect(getComputedStyle(detail).flexShrink).toBe("1");
		expect(getComputedStyle(detail.parentElement!).flexShrink).toBe("1");
	});
});
