import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalendarMonth } from "../src/domain/calendar-month";
import { TimeOfDay } from "../src/domain/time-of-day";
import { I18nProvider } from "../src/i18n/i18n-context";
import { NativeDateInput } from "../src/ui/native-date-input.macos";
import { NativeTimeInput } from "../src/ui/native-time-input.macos";
import { NativeDateInput as WindowsDateInput } from "../src/ui/native-date-input.windows";
import { NativeTimeInput as WindowsTimeInput } from "../src/ui/native-time-input.windows";
import { DesktopDateInput } from "../src/ui/desktop-date-input";
import { DesktopTimeInput } from "../src/ui/desktop-time-input";
import { ThemeProvider } from "../src/ui/theme-context";

afterEach(cleanup);

function wrap(node: React.ReactNode, locale = "en-US") {
	return (
		<ThemeProvider scheme="light">
			<I18nProvider locale={locale}>{node}</I18nProvider>
		</ThemeProvider>
	);
}

describe("CalendarMonth", () => {
	it("lays out whole weeks from the chosen first weekday", () => {
		const weeks = CalendarMonth.containing("2026-11-25").weeks(0);
		expect(weeks).toHaveLength(5);
		expect(weeks[0]).toEqual([
			"2026-11-01",
			"2026-11-02",
			"2026-11-03",
			"2026-11-04",
			"2026-11-05",
			"2026-11-06",
			"2026-11-07",
		]);
		expect(weeks[4]).toEqual(["2026-11-29", "2026-11-30", null, null, null, null, null]);
		expect(CalendarMonth.containing("2026-11-25").weeks(1)[0]).toEqual([
			null,
			null,
			null,
			null,
			null,
			null,
			"2026-11-01",
		]);
	});

	it("moves between months and years, including leap February", () => {
		expect(CalendarMonth.containing("2026-12-31").next().firstDay).toBe("2027-01-01");
		expect(CalendarMonth.containing("2027-01-01").previous().firstDay).toBe("2026-12-01");
		expect(CalendarMonth.containing("2028-01-31").next().firstDay).toBe("2028-02-01");
		const days = CalendarMonth.containing("2028-02-01").weeks(0).flat().filter(Boolean);
		expect(days).toHaveLength(29);
	});
});

describe("TimeOfDay", () => {
	it("normalizes valid times and rejects everything else", () => {
		expect(TimeOfDay.parse(" 7:05 ")).toBe("07:05");
		expect(TimeOfDay.parse("23:59")).toBe("23:59");
		for (const text of ["", "24:00", "12:60", "12", "noon"]) {
			expect(TimeOfDay.parse(text)).toBeNull();
		}
	});
});

describe("desktop date input", () => {
	it("shows the month of the fallback day and reports the clicked day", () => {
		const onChange = vi.fn();
		render(
			wrap(<NativeDateInput label="Due" value={null} fallback="2026-11-25" onChange={onChange} />),
		);
		expect(screen.getByText("November 2026")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Next month"));
		expect(screen.getByText("December 2026")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Thursday, December 24"));
		expect(onChange).toHaveBeenCalledWith("2026-12-24");
		fireEvent.click(screen.getByLabelText("Previous month"));
		expect(screen.getByText("November 2026")).toBeTruthy();
	});

	it("marks the chosen day and follows it when it changes", () => {
		const input = (value: string) =>
			wrap(<NativeDateInput label="Due" value={value} fallback="2026-11-25" onChange={vi.fn()} />);
		const view = render(input("2026-11-27"));
		expect(screen.getByLabelText("Friday, November 27").getAttribute("aria-selected")).toBe("true");
		view.rerender(input("2027-01-05"));
		expect(screen.getByText("January 2027")).toBeTruthy();
	});

	it("starts the British week on Monday", () => {
		render(
			wrap(
				<NativeDateInput label="Due" value={null} fallback="2026-11-25" onChange={vi.fn()} />,
				"en-GB",
			),
		);
		expect(screen.getAllByText(/^[MTWFS]$/).map((node) => node.textContent)).toEqual([
			"M",
			"T",
			"W",
			"T",
			"F",
			"S",
			"S",
		]);
	});
});

describe("desktop time input", () => {
	const field = () => screen.getByLabelText("Time") as HTMLInputElement;

	it("reports a complete time when editing ends", () => {
		const onChange = vi.fn();
		render(wrap(<NativeTimeInput label="Time" value="09:00" onChange={onChange} />));
		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: "7:45" } });
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.keyDown(field(), { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith("07:45");
	});

	it("restores the previous time after invalid text and ignores no change", () => {
		const onChange = vi.fn();
		render(wrap(<NativeTimeInput label="Time" value="09:00" onChange={onChange} />));
		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: "99" } });
		fireEvent.blur(field());
		expect(field().value).toBe("09:00");
		fireEvent.focus(field());
		fireEvent.blur(field());
		expect(onChange).not.toHaveBeenCalled();
	});

	it("follows a time changed elsewhere", () => {
		const input = (value: string) =>
			wrap(<NativeTimeInput label="Time" value={value} onChange={vi.fn()} />);
		const view = render(input("09:00"));
		view.rerender(input("18:00"));
		expect(field().value).toBe("18:00");
	});
});

describe("desktop platform inputs", () => {
	it("gives macOS and Windows the same date and time inputs", () => {
		expect([NativeDateInput, WindowsDateInput]).toEqual([DesktopDateInput, DesktopDateInput]);
		expect([NativeTimeInput, WindowsTimeInput]).toEqual([DesktopTimeInput, DesktopTimeInput]);
	});
});
