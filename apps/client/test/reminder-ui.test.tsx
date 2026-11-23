import { fireEvent, render } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/i18n/i18n-context";
import { I18n } from "../src/i18n/i18n";
import { NativeTimeInput } from "../src/ui/native-time-input";
import { ReminderPicker, ReminderTimes } from "../src/ui/reminder-picker";
import { ThemeProvider } from "../src/ui/theme-context";

interface PickerProps {
	value: Date;
	onChange: (event: unknown, date?: Date) => void;
}

const picker = () => (globalThis as { __datePicker?: PickerProps }).__datePicker!;

afterEach(() => {
	Platform.OS = "web";
});

function wrap(node: React.ReactNode) {
	return (
		<ThemeProvider scheme="light">
			<I18nProvider locale="en-US">{node}</I18nProvider>
		</ThemeProvider>
	);
}

describe("NativeTimeInput", () => {
	it("uses the browser's time field and ignores incomplete input", () => {
		const onChange = vi.fn();
		const { getByLabelText } = render(
			wrap(<NativeTimeInput label="Time" value="09:00" onChange={onChange} />),
		);
		const input = getByLabelText("Time") as HTMLInputElement;
		expect(input.type).toBe("time");
		fireEvent.change(input, { target: { value: "07:45" } });
		expect(onChange).toHaveBeenCalledWith("07:45");
		fireEvent.change(input, { target: { value: "" } });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("follows the dark scheme", () => {
		const { getByLabelText } = render(
			<ThemeProvider scheme="dark">
				<NativeTimeInput label="Time" value="09:00" onChange={vi.fn()} />
			</ThemeProvider>,
		);
		expect((getByLabelText("Time") as HTMLInputElement).style.colorScheme).toBe("dark");
	});

	it("uses the platform picker off the web", () => {
		Platform.OS = "android";
		const onChange = vi.fn();
		render(wrap(<NativeTimeInput label="Time" value="09:30" onChange={onChange} />));
		expect(ReminderTimes.timeOf(picker().value)).toBe("09:30");
		picker().onChange({}, new Date(2000, 0, 1, 7, 5));
		expect(onChange).toHaveBeenCalledWith("07:05");
		picker().onChange({}, undefined);
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});

describe("ReminderPicker", () => {
	const noon = new Date(2026, 10, 19, 12, 0, 0);

	it("offers quick times and custom date and time", () => {
		const onChange = vi.fn();
		const { getByLabelText } = render(
			wrap(<ReminderPicker at={null} now={noon} onChange={onChange} />),
		);
		fireEvent.click(getByLabelText("Remind me Later today"));
		expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 19, 18, 0));
		fireEvent.click(getByLabelText("Remind me Tomorrow"));
		expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 20, 9, 0));
		fireEvent.click(getByLabelText("Remind me Next week"));
		expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 23, 9, 0));
		fireEvent.change(getByLabelText("Custom reminder time"), { target: { value: "2026-12-01" } });
		expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 11, 1, 9, 0));
		fireEvent.change(getByLabelText("Custom reminder time of day"), { target: { value: "07:15" } });
		expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 10, 19, 7, 15));
	});

	it("keeps the chosen day and time, and offers removal", () => {
		const onChange = vi.fn();
		const at = new Date(2026, 11, 3, 14, 20).toISOString();
		const { getByLabelText } = render(
			wrap(<ReminderPicker at={at} now={noon} onChange={onChange} />),
		);
		expect((getByLabelText("Custom reminder time") as HTMLInputElement).value).toBe("2026-12-03");
		expect((getByLabelText("Custom reminder time of day") as HTMLInputElement).value).toBe("14:20");
		fireEvent.change(getByLabelText("Custom reminder time"), { target: { value: "2026-12-04" } });
		expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 11, 4, 14, 20));
		fireEvent.click(getByLabelText("Remove reminder"));
		expect(onChange).toHaveBeenLastCalledWith(null);
	});

	it("hides times that have already passed", () => {
		const evening = new Date(2026, 10, 19, 19, 0, 0);
		const { queryByLabelText } = render(
			wrap(<ReminderPicker at={null} now={evening} onChange={vi.fn()} />),
		);
		expect(queryByLabelText("Remind me Later today")).toBeNull();
		expect(queryByLabelText("Remind me Tomorrow")).not.toBeNull();
	});
});

describe("I18n.reminderLabel", () => {
	it("formats the day and time", () => {
		expect(new I18n("en-US").reminderLabel(new Date(2026, 10, 19, 18, 5).toISOString())).toMatch(
			/Nov 19.*6:05/,
		);
	});
});
