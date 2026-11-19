import { render } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DueDay } from "../src/domain/due-day";
import { NativeDateInput } from "../src/ui/native-date-input";
import { ThemeProvider } from "../src/ui/theme-context";

interface PickerProps {
	value: Date;
	onChange: (event: unknown, date?: Date) => void;
}

const picker = () => (globalThis as { __datePicker?: PickerProps }).__datePicker!;

afterEach(() => {
	Platform.OS = "web";
});

describe("NativeDateInput", () => {
	it("uses the browser's native date field on the web and ignores incomplete input", () => {
		const onChange = vi.fn();
		const { getByLabelText } = render(
			<ThemeProvider scheme="dark">
				<NativeDateInput label="Due" value={null} fallback="2026-11-19" onChange={onChange} />
			</ThemeProvider>,
		);
		const input = getByLabelText("Due") as HTMLInputElement;
		expect(input.type).toBe("date");
		expect(input.value).toBe("");
	});

	it("uses the platform date picker off the web and reports the chosen local day", () => {
		Platform.OS = "ios";
		const onChange = vi.fn();
		render(
			<ThemeProvider scheme="light">
				<NativeDateInput label="Due" value={null} fallback="2026-11-19" onChange={onChange} />
			</ThemeProvider>,
		);
		expect(DueDay.fromDate(picker().value)).toBe("2026-11-19");
		picker().onChange({}, new Date(2026, 11, 24));
		expect(onChange).toHaveBeenCalledWith("2026-12-24");
		picker().onChange({}, undefined);
		expect(onChange).toHaveBeenCalledTimes(1);
		render(
			<ThemeProvider scheme="light">
				<NativeDateInput label="Due" value="2027-01-05" fallback="2026-11-19" onChange={onChange} />
			</ThemeProvider>,
		);
		expect(DueDay.fromDate(picker().value)).toBe("2027-01-05");
	});
});
