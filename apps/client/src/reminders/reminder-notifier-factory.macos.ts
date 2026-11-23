import { NativeModules } from "react-native";
import { DesktopReminderNotifier, type DesktopReminderModule } from "./desktop-reminder-notifier";
import type { ReminderNotifier } from "./reminder-notifier";

export function createReminderNotifier(): ReminderNotifier {
	return new DesktopReminderNotifier(
		NativeModules.AnotherToDoReminders as DesktopReminderModule | undefined,
	);
}
