import type { Task } from "../domain/task";
import { Observable } from "../state/observable";
import type { Clock } from "../domain/ports";
import type { NotificationPermission, ReminderNotifier } from "./reminder-notifier";

export interface ReminderState {
	readonly available: boolean;
	readonly permission: NotificationPermission;
}

export interface TaskSource {
	get(): { readonly tasks: readonly Task[] };
	subscribe(listener: () => void): () => void;
}

export class ReminderService extends Observable<ReminderState> {
	private readonly scheduled = new Map<string, string>();
	private unsubscribe: (() => void) | null = null;

	constructor(
		private readonly notifier: ReminderNotifier,
		private readonly tasks: TaskSource,
		private readonly clock: Clock,
	) {
		super({ available: notifier.available, permission: "undetermined" });
	}

	async start(): Promise<void> {
		this.stop();
		this.unsubscribe = this.tasks.subscribe(() => void this.sync());
		await this.notifier.clear();
		this.scheduled.clear();
		this.set({
			available: this.notifier.available,
			permission: await this.notifier.permission(),
		});
		await this.sync();
	}

	stop(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	async ensurePermission(): Promise<NotificationPermission> {
		let permission = await this.notifier.permission();
		if (permission === "undetermined") {
			permission = await this.notifier.requestPermission();
		}
		this.set({ ...this.get(), permission });
		return permission;
	}

	async sync(): Promise<void> {
		const now = this.clock.now().getTime();
		const wanted = new Map<string, { title: string; at: string }>();
		for (const task of this.tasks.get().tasks) {
			const at = task.remindAt;
			if (at !== null && !task.completed && Date.parse(at) > now) {
				wanted.set(task.id, { title: task.title, at });
			}
		}
		for (const id of [...this.scheduled.keys()]) {
			if (!wanted.has(id)) {
				this.scheduled.delete(id);
				await this.notifier.cancel(id);
			}
		}
		for (const [id, { title, at }] of wanted) {
			const key = `${at}|${title}`;
			if (this.scheduled.get(id) !== key) {
				this.scheduled.set(id, key);
				await this.notifier.schedule(id, title, new Date(at)).catch(() => {
					this.scheduled.delete(id);
				});
			}
		}
	}
}
