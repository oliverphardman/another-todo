import { cleanup, render, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { CREDENTIAL_FIELD_WIDTH, CredentialField } from "../src/ui/credential-field";
import { ThemeProvider } from "../src/ui/theme-context";

const original = Platform.OS;

afterEach(() => {
	cleanup();
	Platform.OS = original;
});

describe("credential field", () => {
	it.each(["", "https://api.a-very-long-server-name.example.com/with/a/path"])(
		"keeps the same width whatever it holds: %j",
		(value) => {
			render(
				<ThemeProvider scheme="dark">
					<CredentialField label="Address" placeholder="" value={value} onChange={() => {}} />
				</ThemeProvider>,
			);
			expect(screen.getByLabelText("Address").style.width).toBe(`${CREDENTIAL_FIELD_WIDTH}px`);
		},
	);

	it.each([
		["web", true],
		["macos", true],
		["android", false],
		["ios", false],
	])("takes focus by itself on %s: %s", (platform, focused) => {
		Platform.OS = platform as typeof Platform.OS;
		render(
			<CredentialField label="Address" placeholder="" value="" onChange={() => {}} autoFocus />,
		);
		expect(document.activeElement === screen.getByLabelText("Address")).toBe(focused);
	});
});
