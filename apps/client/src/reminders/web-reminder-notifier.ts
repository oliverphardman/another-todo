import type { NotificationPermission, ReminderNotifier } from "./reminder-notifier";

export interface BrowserNotifications {
	readonly permission: "default" | "granted" | "denied";
	requestPermission(): Promise<"default" | "granted" | "denied">;
	show(title: string, tag: string): void;
}

export class WindowNotifications implements BrowserNotifications {
	get permission(): "default" | "granted" | "denied" {
		return Notification.permission;
	}

	requestPermission(): Promise<"default" | "granted" | "denied"> {
		return Notification.requestPermission();
	}

	show(title: string, tag: string): void {
		new Notification(title, { tag });
	}
}

const CHECK_MS = 15_000;

export class WebReminderNotifier implements ReminderNotifier {
	readonly available: boolean;
	private readonly due = new Map<string, { title: string; at: number }>();
	private timer: ReturnType<typeof setInterval> | null = null;

	constructor(
		private readonly notifications: BrowserNotifications | null,
		private readonly now: () => number = Date.now,
	) {
		this.available = notifications !== null;
	}

	static detect(): WebReminderNotifier {
		return new WebReminderNotifier(
			typeof Notification === "undefined" ? null : new WindowNotifications(),
		);
	}

	async permission(): Promise<NotificationPermission> {
		return WebReminderNotifier.translate(this.notifications?.permission ?? "denied");
	}

	async requestPermission(): Promise<NotificationPermission> {
		return WebReminderNotifier.translate(
			(await this.notifications?.requestPermission()) ?? "denied",
		);
	}

	async schedule(id: string, title: string, at: Date): Promise<void> {
		this.due.set(id, { title, at: at.getTime() });
		this.timer ??= setInterval(() => this.fire(), CHECK_MS);
	}

	async cancel(id: string): Promise<void> {
		this.due.delete(id);
		this.stopWhenIdle();
	}

	async clear(): Promise<void> {
		this.due.clear();
		this.stopWhenIdle();
	}

	private fire(): void {
		for (const [id, reminder] of [...this.due]) {
			if (reminder.at <= this.now()) {
				this.due.delete(id);
				if (this.notifications?.permission === "granted") {
					this.notifications.show(reminder.title, id);
				}
			}
		}
		this.stopWhenIdle();
	}

	private stopWhenIdle(): void {
		if (this.due.size === 0 && this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	private static translate(value: "default" | "granted" | "denied"): NotificationPermission {
		return value === "default" ? "undetermined" : value;
	}
}
