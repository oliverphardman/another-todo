import { Task, type TaskData } from "../domain/task";
import type { Operation } from "./operation";

export class Outbox {
	constructor(readonly operations: readonly Operation[] = []) {}

	get isEmpty(): boolean {
		return this.operations.length === 0;
	}

	enqueue(operation: Operation): Outbox {
		switch (operation.kind) {
			case "putSettings":
				return this.enqueueSettings(operation);
			case "updateTask":
				return this.enqueueTaskUpdate(operation);
			case "deleteTask":
				return this.enqueueTaskDelete(operation);
			case "renameList":
				return this.enqueueListRename(operation);
			case "moveList":
				return this.enqueueListMove(operation);
			case "deleteList":
				return this.enqueueListDelete(operation);
			default:
				return new Outbox([...this.operations, operation]);
		}
	}

	discardTasks(taskIds: ReadonlySet<string>): Outbox {
		return new Outbox(
			this.operations.filter((operation) => !Outbox.touchesTask(operation, taskIds)),
		);
	}

	discardSettings(viewId: string): Outbox {
		return new Outbox(
			this.operations.filter(
				(operation) => !(operation.kind === "putSettings" && operation.settings.id === viewId),
			),
		);
	}

	pendingSettingsIds(): ReadonlySet<string> {
		return new Set(
			this.operations.flatMap((operation) =>
				operation.kind === "putSettings" ? [operation.settings.id] : [],
			),
		);
	}

	markSending(opId: string): Outbox {
		return new Outbox(
			this.operations.map((operation) =>
				operation.opId === opId ? { ...operation, sending: true } : operation,
			),
		);
	}

	clearSending(): Outbox {
		return new Outbox(
			this.operations.map((operation) => {
				const { sending: _sending, ...rest } = operation;
				return rest as Operation;
			}),
		);
	}

	remove(opId: string): Outbox {
		return new Outbox(this.operations.filter((operation) => operation.opId !== opId));
	}

	pendingTaskIds(): ReadonlySet<string> {
		const ids = new Set<string>();
		for (const operation of this.operations) {
			if (operation.kind === "createTask") {
				ids.add(operation.task.id);
			} else if (operation.kind === "updateTask" || operation.kind === "deleteTask") {
				ids.add(operation.taskId);
			}
		}
		return ids;
	}

	pendingListIds(): ReadonlySet<string> {
		const ids = new Set<string>();
		for (const operation of this.operations) {
			if (operation.kind === "createList") {
				ids.add(operation.list.id);
			} else if (
				operation.kind === "renameList" ||
				operation.kind === "moveList" ||
				operation.kind === "deleteList"
			) {
				ids.add(operation.listId);
			}
		}
		return ids;
	}

	private enqueueSettings(operation: Extract<Operation, { kind: "putSettings" }>): Outbox {
		const remaining = this.operations.filter(
			(candidate) =>
				!(
					candidate.kind === "putSettings" &&
					candidate.settings.id === operation.settings.id &&
					!candidate.sending
				),
		);
		return new Outbox([...remaining, operation]);
	}

	private enqueueTaskUpdate(operation: Extract<Operation, { kind: "updateTask" }>): Outbox {
		const target = this.findMergeTarget(operation.taskId);
		if (target === -1) {
			return new Outbox([...this.operations, operation]);
		}
		const existing = this.operations[target]!;
		const merged: Operation =
			existing.kind === "createTask"
				? {
						...existing,
						task: new Task(existing.task).with(operation.changes).data,
					}
				: {
						...(existing as Extract<Operation, { kind: "updateTask" }>),
						changes: {
							...(existing as Extract<Operation, { kind: "updateTask" }>).changes,
							...operation.changes,
						},
					};
		return new Outbox(
			this.operations.map((candidate, index) => (index === target ? merged : candidate)),
		);
	}

	private enqueueTaskDelete(operation: Extract<Operation, { kind: "deleteTask" }>): Outbox {
		const ids = new Set([operation.taskId]);
		const created = this.operations.some(
			(candidate) =>
				candidate.kind === "createTask" &&
				candidate.task.id === operation.taskId &&
				!candidate.sending,
		);
		const remaining = this.discardTasks(ids);
		return created ? remaining : new Outbox([...remaining.operations, operation]);
	}

	private enqueueListRename(operation: Extract<Operation, { kind: "renameList" }>): Outbox {
		const createIndex = this.operations.findIndex(
			(candidate) =>
				candidate.kind === "createList" &&
				candidate.list.id === operation.listId &&
				!candidate.sending,
		);
		if (createIndex !== -1) {
			const create = this.operations[createIndex] as Extract<Operation, { kind: "createList" }>;
			const renamed: Operation = {
				...create,
				list: { ...create.list, name: operation.name },
			};
			return new Outbox(
				this.operations.map((candidate, index) => (index === createIndex ? renamed : candidate)),
			);
		}
		const without = this.operations.filter(
			(candidate) =>
				!(
					candidate.kind === "renameList" &&
					candidate.listId === operation.listId &&
					!candidate.sending
				),
		);
		return new Outbox([...without, operation]);
	}

	private enqueueListMove(operation: Extract<Operation, { kind: "moveList" }>): Outbox {
		const without = this.operations.filter(
			(candidate) =>
				!(
					candidate.kind === "moveList" &&
					candidate.listId === operation.listId &&
					!candidate.sending
				),
		);
		return new Outbox([...without, operation]);
	}

	private enqueueListDelete(operation: Extract<Operation, { kind: "deleteList" }>): Outbox {
		const created = this.operations.some(
			(candidate) =>
				candidate.kind === "createList" &&
				candidate.list.id === operation.listId &&
				!candidate.sending,
		);
		const remaining = this.operations.filter(
			(candidate) =>
				!(
					(candidate.kind === "createList" && candidate.list.id === operation.listId) ||
					(candidate.kind === "renameList" && candidate.listId === operation.listId) ||
					(candidate.kind === "moveList" && candidate.listId === operation.listId)
				),
		);
		return created ? new Outbox(remaining) : new Outbox([...remaining, operation]);
	}

	private findMergeTarget(taskId: string): number {
		for (let index = this.operations.length - 1; index >= 0; index -= 1) {
			const candidate = this.operations[index]!;
			if (
				(candidate.kind === "createTask" && candidate.task.id === taskId) ||
				(candidate.kind === "updateTask" && candidate.taskId === taskId)
			) {
				return candidate.sending ? -1 : index;
			}
			if (
				candidate.kind === "createList" ||
				candidate.kind === "renameList" ||
				candidate.kind === "moveList" ||
				candidate.kind === "deleteList"
			) {
				return -1;
			}
		}
		return -1;
	}

	private static touchesTask(operation: Operation, taskIds: ReadonlySet<string>): boolean {
		if (operation.kind === "createTask") {
			return taskIds.has((operation.task as TaskData).id);
		}
		if (operation.kind === "updateTask" || operation.kind === "deleteTask") {
			return taskIds.has(operation.taskId);
		}
		return false;
	}
}
