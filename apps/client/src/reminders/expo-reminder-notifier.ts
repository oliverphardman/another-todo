import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationPermission, ReminderNotifier } from "./reminder-notifier";

const CHANNEL = "reminders";

export class ExpoReminderNotifier implements ReminderNotifier {
	readonly available = true;
	private prepared: Promise<void> | null = null;

	async permission(): Promise<NotificationPermission> {
		return ExpoReminderNotifier.translate(await Notifications.getPermissionsAsync());
	}

	async requestPermission(): Promise<NotificationPermission> {
		await this.prepare();
		return ExpoReminderNotifier.translate(await Notifications.requestPermissionsAsync());
	}

	async schedule(id: string, title: string, at: Date): Promise<void> {
		await this.prepare();
		await Notifications.scheduleNotificationAsync({
			identifier: id,
			content: { title, sound: true },
			trigger: {
				type: Notifications.SchedulableTriggerInputTypes.DATE,
				date: at,
				channelId: CHANNEL,
			},
		});
	}

	async cancel(id: string): Promise<void> {
		await Notifications.cancelScheduledNotificationAsync(id);
	}

	async clear(): Promise<void> {
		await Notifications.cancelAllScheduledNotificationsAsync();
	}

	private prepare(): Promise<void> {
		this.prepared ??= (async () => {
			Notifications.setNotificationHandler({
				handleNotification: async () => ({
					shouldPlaySound: true,
					shouldSetBadge: false,
					shouldShowBanner: true,
					shouldShowList: true,
				}),
			});
			if (Platform.OS === "android") {
				await Notifications.setNotificationChannelAsync(CHANNEL, {
					name: "Reminders",
					importance: Notifications.AndroidImportance.HIGH,
				});
			}
		})();
		return this.prepared;
	}

	private static translate(
		state: Notifications.NotificationPermissionsStatus,
	): NotificationPermission {
		if (state.granted) {
			return "granted";
		}
		return state.canAskAgain ? "undetermined" : "denied";
	}
}
