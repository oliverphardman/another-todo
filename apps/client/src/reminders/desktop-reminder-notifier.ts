import type { NotificationPermission, ReminderNotifier } from "./reminder-notifier";

export interface DesktopReminderModule {
	permission(): Promise<NotificationPermission>;
	requestPermission(): Promise<NotificationPermission>;
	schedule(id: string, title: string, at: number): Promise<void>;
	cancel(id: string): Promise<void>;
	clear(): Promise<void>;
}

export class DesktopReminderNotifier implements ReminderNotifier {
	readonly available: boolean;

	constructor(private readonly module: DesktopReminderModule | null | undefined) {
		this.available = module !== null && module !== undefined;
	}

	async permission(): Promise<NotificationPermission> {
		return this.module?.permission() ?? "denied";
	}

	async requestPermission(): Promise<NotificationPermission> {
		return this.module?.requestPermission() ?? "denied";
	}

	async schedule(id: string, title: string, at: Date): Promise<void> {
		await this.module?.schedule(id, title, at.getTime());
	}

	async cancel(id: string): Promise<void> {
		await this.module?.cancel(id);
	}

	async clear(): Promise<void> {
		await this.module?.clear();
	}
}
