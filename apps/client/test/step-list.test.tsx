import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddStepRow } from "../src/ui/step-list";
import { ThemeProvider } from "../src/ui/theme-context";

function renderRow() {
	const onAdd = vi.fn();
	render(
		<ThemeProvider scheme="light">
			<AddStepRow onAdd={onAdd} />
		</ThemeProvider>,
	);
	fireEvent.click(screen.getByLabelText("Add step"));
	return { onAdd, field: screen.getByLabelText("New step") };
}

describe("AddStepRow", () => {
	it("discards the text on Escape and a following blur adds nothing", () => {
		const { onAdd, field } = renderRow();
		fireEvent.change(field, { target: { value: "Discard me" } });
		fireEvent.keyDown(field, { key: "Escape" });
		fireEvent.blur(field);
		expect(onAdd).not.toHaveBeenCalled();
		expect(screen.getByLabelText("Add step")).toBeTruthy();
	});

	it("adds on Enter and keeps the field open for the next step", () => {
		const { onAdd, field } = renderRow();
		fireEvent.change(field, { target: { value: "One" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(onAdd).toHaveBeenCalledWith("One");
		expect(screen.getByLabelText("New step")).toBeTruthy();
	});

	it("adds what was typed when the field loses focus", () => {
		const { onAdd, field } = renderRow();
		fireEvent.change(field, { target: { value: "Two" } });
		fireEvent.blur(field);
		expect(onAdd).toHaveBeenCalledWith("Two");
		expect(screen.getByLabelText("Add step")).toBeTruthy();
	});
});
