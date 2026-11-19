import type { ApiGateway } from "../api/api-gateway";
import { ApiError, AuthRequiredError, NetworkError } from "../api/errors";
import type { LocalDatabase } from "../storage/local-database";
import type { Operation } from "./operation";
import { Outbox } from "./outbox";

export type SyncOutcome = "synced" | "offline" | "unauthorized";

export interface SyncReport {
	readonly outcome: SyncOutcome;
	readonly rejected: number;
}

export class SyncEngine {
	private running: Promise<SyncReport> | null = null;
	private rerun = false;

	constructor(
		private readonly database: LocalDatabase,
		private readonly gateway: ApiGateway,
	) {}

	sync(): Promise<SyncReport> {
		if (this.running !== null) {
			this.rerun = true;
			return this.running;
		}
		this.running = this.run().finally(() => {
			this.running = null;
		});
		return this.running;
	}

	private async run(): Promise<SyncReport> {
		let rejected = 0;
		let report: SyncReport;
		do {
			this.rerun = false;
			report = await this.runOnce();
			rejected += report.rejected;
		} while (this.rerun && report.outcome === "synced");
		return { outcome: report.outcome, rejected };
	}

	private async runOnce(): Promise<SyncReport> {
		const counter = { rejected: 0 };
		try {
			await this.releaseStaleClaims();
			await this.push(counter);
			await this.pull();
			return { outcome: "synced", rejected: counter.rejected };
		} catch (error) {
			return { outcome: SyncEngine.outcomeOf(error), rejected: counter.rejected };
		}
	}

	private static outcomeOf(error: unknown): SyncOutcome {
		if (error instanceof AuthRequiredError || (error instanceof ApiError && error.status === 401)) {
			return "unauthorized";
		}
		if (error instanceof NetworkError || error instanceof ApiError) {
			return "offline";
		}
		throw error;
	}

	private async releaseStaleClaims(): Promise<void> {
		if (this.database.get().outbox.some((operation) => operation.sending)) {
			await this.database.apply((snapshot) => ({
				...snapshot,
				outbox: new Outbox(snapshot.outbox).clearSending().operations,
			}));
		}
	}

	private async push(counter: { rejected: number }): Promise<void> {
		for (;;) {
			const operation = this.database.get().outbox[0];
			if (operation === undefined) {
				return;
			}
			await this.database.apply((snapshot) => ({
				...snapshot,
				outbox: new Outbox(snapshot.outbox).markSending(operation.opId).operations,
			}));
			try {
				await this.dispatch(operation);
			} catch (error) {
				if (!(error instanceof ApiError) || !error.isPermanent || error.status === 401) {
					throw error;
				}
				counter.rejected += 1;
			}
			await this.database.apply((snapshot) => ({
				...snapshot,
				outbox: new Outbox(snapshot.outbox).remove(operation.opId).operations,
			}));
		}
	}

	private dispatch(operation: Operation): Promise<void> {
		switch (operation.kind) {
			case "putSettings":
				return this.gateway.putSettings(operation.settings);
			case "createList":
				return this.gateway.createList(operation.list);
			case "renameList":
				return this.gateway.renameList(operation.listId, operation.name);
			case "deleteList":
				return this.gateway.deleteList(operation.listId);
			case "createTask":
				return this.gateway.createTask(operation.task);
			case "updateTask":
				return this.gateway.updateTask(operation.taskId, operation.changes);
			case "deleteTask":
				return this.gateway.deleteTask(operation.taskId);
		}
	}

	private async pull(): Promise<void> {
		const [lists, tasks, settings] = await Promise.all([
			this.gateway.listLists(),
			this.gateway.listTasks(),
			this.gateway.listSettings(),
		]);
		await this.database.apply((snapshot) => {
			const outbox = new Outbox(snapshot.outbox);
			const pendingTasks = outbox.pendingTaskIds();
			const pendingLists = outbox.pendingListIds();
			const pendingSettings = outbox.pendingSettingsIds();
			return {
				...snapshot,
				lists: [
					...lists.filter((list) => !pendingLists.has(list.id)),
					...snapshot.lists.filter((list) => pendingLists.has(list.id)),
				],
				settings: [
					...settings.filter((entry) => !pendingSettings.has(entry.id)),
					...snapshot.settings.filter((entry) => pendingSettings.has(entry.id)),
				],
				tasks: [
					...tasks.filter((task) => !pendingTasks.has(task.id)),
					...snapshot.tasks.filter((task) => pendingTasks.has(task.id)),
				],
			};
		});
	}
}
