import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ListTheme } from "../src/ui/list-theme";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

const rgb = (hex: string) =>
	`rgb(${[1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)).join(", ")})`;

describe("list titles", () => {
	it.each(["light", "dark"] as const)("follow the list theme in %s mode", async (scheme) => {
		const app = await renderApp({ scheme });
		stop = app.stop;
		act(() => {
			app.container.store.addList("Garden");
			const [list] = app.container.store.get().lists;
			app.container.store.updateSettings(list!.id, {
				theme: { type: "color", color: "#c0392b" },
			});
		});
		const theme = ListTheme.resolve(
			{ type: "color", color: "#c0392b" },
			null,
			scheme === "dark",
			"#6074c3",
		);
		const title = screen.getByRole("heading", { name: "Garden" });
		expect(title.style.color).toBe(rgb(theme.overrides.title!));
		expect(title.style.color === "rgb(255, 255, 255)").toBe(scheme === "light");
	});
});
