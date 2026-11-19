import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { ListPrintDocument } from "../src/print/list-print-document";

const TODAY = "2026-11-19";

describe("ListPrintDocument", () => {
	it("lists open and completed tasks with their details, escaping everything", () => {
		const open = Task.create("1", 'Buy <milk> & "eggs"', "x").with({
			importance: "high",
			dueDate: "2026-11-20T00:00:00.000Z",
			steps: [
				{ id: "a", title: "Check <date>", completed: true },
				{ id: "b", title: "Pay", completed: false },
			],
			note: "Line one\nLine two & more",
		});
		const done = Task.create("2", "Old news", "x").with({ completed: true });
		const html = ListPrintDocument.html({
			title: "Groceries <1>",
			subtitle: "Thursday, November 19",
			open: [open],
			done: [done],
			today: TODAY,
		});
		expect(html).toContain("<title>Groceries &lt;1&gt;</title>");
		expect(html).toContain("<h1>Groceries &lt;1&gt;</h1>");
		expect(html).toContain('<p class="subtitle">Thursday, November 19</p>');
		expect(html).toContain("<h2>To do</h2>");
		expect(html).toContain("Buy &lt;milk&gt; &amp; &quot;eggs&quot;");
		expect(html).toContain("Due Tomorrow · Important");
		expect(html).toContain("&#9745; Check &lt;date&gt;");
		expect(html).toContain("&#9744; Pay");
		expect(html).toContain("Line one\nLine two &amp; more");
		expect(html).toContain("<h2>Completed</h2>");
		expect(html).toContain('class="done"');
		expect(html).not.toContain("<milk>");
	});

	it("leaves out empty sections, details and the subtitle", () => {
		const html = ListPrintDocument.html({
			title: "Empty",
			subtitle: null,
			open: [Task.create("1", "Plain", "x")],
			done: [],
			today: TODAY,
		});
		expect(html).not.toContain('subtitle">');
		expect(html).not.toContain("<h2>Completed</h2>");
		expect(html).not.toContain('class="meta"');
		expect(html).not.toContain('class="steps"');
		expect(html).not.toContain('class="note"');
		expect(html).toContain("&#9744; Plain");
		const none = ListPrintDocument.html({
			title: "T",
			subtitle: null,
			open: [],
			done: [],
			today: TODAY,
		});
		expect(none).not.toContain("<h2>");
	});
});
