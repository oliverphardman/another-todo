import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { menuLook } from "../src/ui/menu-look";
import { NewListField } from "../src/ui/new-list-field";
import { ThemeProvider } from "../src/ui/theme-context";

function renderField() {
	const onSubmit = vi.fn();
	const onCancel = vi.fn();
	render(
		<ThemeProvider scheme="light">
			<NewListField metrics={menuLook("compact").metrics} onSubmit={onSubmit} onCancel={onCancel} />
		</ThemeProvider>,
	);
	return { onSubmit, onCancel, field: screen.getByLabelText("New List") };
}

describe("NewListField", () => {
	it("is focused immediately", () => {
		const { field } = renderField();
		expect(document.activeElement).toBe(field);
	});

	it("submits once even when pressing Enter is followed by a blur", () => {
		const { field, onSubmit, onCancel } = renderField();
		fireEvent.change(field, { target: { value: "Groceries" } });
		fireEvent.keyDown(field, { key: "Enter" });
		fireEvent.blur(field);
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith("Groceries");
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("cancels once on Escape, and the following blur does not create a list", () => {
		const { field, onSubmit, onCancel } = renderField();
		fireEvent.change(field, { target: { value: "Discarded" } });
		fireEvent.keyDown(field, { key: "Escape" });
		fireEvent.blur(field);
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("cancels when the field is left empty", () => {
		const { field, onSubmit, onCancel } = renderField();
		fireEvent.blur(field);
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("ignores other keys", () => {
		const { field, onCancel } = renderField();
		fireEvent.keyDown(field, { key: "a" });
		expect(onCancel).not.toHaveBeenCalled();
	});
});
