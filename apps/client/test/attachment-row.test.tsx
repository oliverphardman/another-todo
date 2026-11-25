import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttachmentData } from "../src/attachments/attachment";
import { I18nProvider } from "../src/i18n/i18n-context";
import { I18n } from "../src/i18n/i18n";
import { AttachmentRow } from "../src/ui/attachment-row";
import { ThemeProvider } from "../src/ui/theme-context";

afterEach(cleanup);

const file = (name: string, contentType: string): AttachmentData => ({
	id: "f",
	taskId: "t",
	name,
	contentType,
	size: 579_584,
	createdAt: "x",
	url: "https://files.test/f",
});

function show(attachment: AttachmentData) {
	const onOpen = vi.fn();
	const onRemove = vi.fn();
	const view = render(
		<ThemeProvider scheme="light">
			<I18nProvider>
				<AttachmentRow file={attachment} onOpen={onOpen} onRemove={onRemove} />
			</I18nProvider>
		</ThemeProvider>,
	);
	return { ...view, onOpen, onRemove };
}

describe("an attachment row", () => {
	it("shows the name and size, opens on press and removes from its cross", () => {
		const { onOpen, onRemove } = show(file("report.pdf", "application/pdf"));
		expect(screen.getByText("report.pdf")).toBeTruthy();
		expect(screen.getByText("566 KB")).toBeTruthy();
		expect(screen.getByText("PDF")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Open report.pdf"));
		fireEvent.click(screen.getByLabelText("Remove report.pdf"));
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it("previews images", () => {
		const { container } = show(file("oh-bg.jpg", "image/jpeg"));
		expect(container.innerHTML).toContain("https://files.test/f");
		expect(screen.queryByText("JPG")).toBeNull();
	});

	it("labels the tile with at most four letters, or none", () => {
		show(file("notes.markdown", "text/markdown"));
		expect(screen.getByText("MARK")).toBeTruthy();
		cleanup();
		show(file(".env", "text/plain"));
		expect(screen.queryByText("ENV")).toBeNull();
	});

	it("writes sizes in bytes, kilobytes or megabytes", () => {
		const i18n = new I18n("en-US");
		expect(i18n.fileSize(12)).toBe("12 B");
		expect(i18n.fileSize(1024)).toBe("1 KB");
		expect(i18n.fileSize(5 * 1024 * 1024 + 300 * 1024)).toBe("5.3 MB");
		expect(i18n.fileSize(25 * 1024 * 1024)).toBe("25 MB");
	});
});
