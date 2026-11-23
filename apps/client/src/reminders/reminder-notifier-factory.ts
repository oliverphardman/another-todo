import { Platform } from "react-native";
import { ExpoReminderNotifier } from "./expo-reminder-notifier";
import type { ReminderNotifier } from "./reminder-notifier";
import { WebReminderNotifier } from "./web-reminder-notifier";

export function createReminderNotifier(): ReminderNotifier {
	return Platform.OS === "web" ? WebReminderNotifier.detect() : new ExpoReminderNotifier();
}
