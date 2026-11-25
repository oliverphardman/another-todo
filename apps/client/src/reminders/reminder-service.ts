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

interface Scheduled {
	readonly key: string;
	readonly at: string;
}

const LONGEST_WAIT_MS = 2_147_483_647;

export class ReminderService extends Observable<ReminderState> {
	private readonly scheduled = new Map<string, Scheduled>();
	private timer: ReturnType<typeof setTimeout> | null = null;
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
		this.disarm();
	}

	async reset(): Promise<void> {
		this.stop();
		this.scheduled.clear();
		await this.notifier.clear();
	}

	async ensurePermission(): Promise<NotificationPermission> {
		let permission = await this.notifier.permission();
		if (permission === "undetermined") {
			permission = await this.notifier.requestPermission();
		}
		this.set({ ...this.get(), permission });
		if (permission === "granted") {
			await this.sync();
		}
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
		this.arm(now, [...wanted.values()]);
		for (const [id, { at }] of [...this.scheduled]) {
			if (!wanted.has(id)) {
				this.scheduled.delete(id);
				if (!this.hasComeDue(id, at, now)) {
					await this.notifier.cancel(id);
				}
			}
		}
		for (const [id, { title, at }] of wanted) {
			const key = `${at}|${title}`;
			if (this.scheduled.get(id)?.key !== key) {
				this.scheduled.set(id, { key, at });
				await this.notifier.schedule(id, title, new Date(at)).catch(() => {
					this.scheduled.delete(id);
				});
			}
		}
	}

	private hasComeDue(id: string, at: string, now: number): boolean {
		return (
			Date.parse(at) <= now &&
			this.tasks
				.get()
				.tasks.some((task) => task.id === id && !task.completed && task.remindAt === at)
		);
	}

	private arm(now: number, upcoming: readonly { readonly at: string }[]): void {
		this.disarm();
		if (this.unsubscribe === null || upcoming.length === 0) {
			return;
		}
		const next = Math.min(...upcoming.map(({ at }) => Date.parse(at)));
		this.timer = setTimeout(
			() => {
				this.set({ ...this.get() });
				void this.sync();
			},
			Math.min(next - now, LONGEST_WAIT_MS),
		);
	}

	private disarm(): void {
		if (this.timer !== null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
}
