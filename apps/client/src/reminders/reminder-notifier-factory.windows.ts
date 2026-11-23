import type { ReminderNotifier } from "./reminder-notifier";
import { UnavailableReminderNotifier } from "./unavailable-reminder-notifier";

export function createReminderNotifier(): ReminderNotifier {
	return new UnavailableReminderNotifier();
}
