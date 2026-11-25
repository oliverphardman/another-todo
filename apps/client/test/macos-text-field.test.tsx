import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { TextInput } from "react-native";
import { describe, expect, it } from "vitest";
import { TextField as MacTextField } from "../src/ui/text-field.macos";
import { TextField } from "../src/ui/text-field";

describe("text field", () => {
	it("is the plain text input away from macOS", () => {
		expect(TextField).toBe(TextInput);
	});

	it("turns off the focus ring on macOS", () => {
		expect(MacTextField({ value: "Milk" }).props).toMatchObject({
			value: "Milk",
			enableFocusRing: false,
		});
	});

	it("renders an editable field on macOS", () => {
		render(createElement(MacTextField, { accessibilityLabel: "Title", defaultValue: "Milk" }));
		expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Milk");
	});
});
