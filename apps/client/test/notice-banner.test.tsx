import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderApp } from "./support/render-app";

afterEach(cleanup);

describe("notice banner", () => {
	it("is hidden when the server has no notice", async () => {
		await renderApp();
		expect(screen.queryByLabelText("Dismiss notice")).toBeNull();
	});

	it("shows the server's notice and can be dismissed locally", async () => {
		await renderApp({ config: { notice: "This is a public demo." } });
		expect(screen.getByText("This is a public demo.")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Dismiss notice"));
		expect(screen.queryByText("This is a public demo.")).toBeNull();
	});
});
