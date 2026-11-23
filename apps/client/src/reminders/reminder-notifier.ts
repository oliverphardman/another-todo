export type NotificationPermission = "granted" | "denied" | "undetermined";

export interface ReminderNotifier {
	readonly available: boolean;
	permission(): Promise<NotificationPermission>;
	requestPermission(): Promise<NotificationPermission>;
	schedule(id: string, title: string, at: Date): Promise<void>;
	cancel(id: string): Promise<void>;
	clear(): Promise<void>;
}
