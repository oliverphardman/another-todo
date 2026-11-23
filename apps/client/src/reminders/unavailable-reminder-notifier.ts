import type { NotificationPermission, ReminderNotifier } from "./reminder-notifier";

export class UnavailableReminderNotifier implements ReminderNotifier {
	readonly available = false;

	async permission(): Promise<NotificationPermission> {
		return "denied";
	}

	async requestPermission(): Promise<NotificationPermission> {
		return "denied";
	}

	async schedule(): Promise<void> {
		return;
	}

	async cancel(): Promise<void> {
		return;
	}

	async clear(): Promise<void> {
		return;
	}
}
