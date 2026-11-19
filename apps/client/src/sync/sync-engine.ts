import type { ApiGateway } from "../api/api-gateway";
import { ApiError, AuthRequiredError, NetworkError } from "../api/errors";
import type { LocalDatabase } from "../storage/local-database";
import type { Operation } from "./operation";
import { Outbox } from "./outbox";

export type SyncOutcome = "synced" | "offline" | "unauthorized";

export class SyncEngine {
	private running: Promise<SyncOutcome> | null = null;
	private rerun = false;

	constructor(
		private readonly database: LocalDatabase,
		private readonly gateway: ApiGateway,
	) {}

	sync(): Promise<SyncOutcome> {
		if (this.running !== null) {
			this.rerun = true;
			return this.running;
		}
		this.running = this.run().finally(() => {
			this.running = null;
		});
		return this.running;
	}

	private async run(): Promise<SyncOutcome> {
		let outcome: SyncOutcome;
		do {
			this.rerun = false;
			outcome = await this.runOnce();
		} while (this.rerun && outcome === "synced");
		return outcome;
	}

	private async runOnce(): Promise<SyncOutcome> {
		try {
			await this.push();
			await this.pull();
			return "synced";
		} catch (error) {
			return SyncEngine.outcomeOf(error);
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

	private async push(): Promise<void> {
		for (;;) {
			const operation = this.database.get().outbox[0];
			if (operation === undefined) {
				return;
			}
			try {
				await this.dispatch(operation);
			} catch (error) {
				if (!(error instanceof ApiError) || !error.isPermanent || error.status === 401) {
					throw error;
				}
			}
			await this.database.apply((snapshot) => ({
				...snapshot,
				outbox: new Outbox(snapshot.outbox).remove(operation.opId).operations,
			}));
		}
	}

	private dispatch(operation: Operation): Promise<void> {
		switch (operation.kind) {
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
		const [lists, tasks] = await Promise.all([this.gateway.listLists(), this.gateway.listTasks()]);
		await this.database.apply((snapshot) => {
			const outbox = new Outbox(snapshot.outbox);
			const pendingTasks = outbox.pendingTaskIds();
			const pendingLists = outbox.pendingListIds();
			return {
				...snapshot,
				lists: [
					...lists.filter((list) => !pendingLists.has(list.id)),
					...snapshot.lists.filter((list) => pendingLists.has(list.id)),
				],
				tasks: [
					...tasks.filter((task) => !pendingTasks.has(task.id)),
					...snapshot.tasks.filter((task) => pendingTasks.has(task.id)),
				],
			};
		});
	}
}
