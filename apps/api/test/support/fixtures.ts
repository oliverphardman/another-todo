import { ListService } from "../../src/application/list-service";
import type { Clock, IdGenerator } from "../../src/application/ports";
import { TaskService } from "../../src/application/task-service";
import { InMemoryTaskRepository } from "../../src/domain/in-memory-task-repository";
import { InMemoryTodoListRepository } from "../../src/domain/in-memory-todo-list-repository";

export class FixedClock implements Clock {
	constructor(private current = new Date("2026-01-01T00:00:00Z")) {}

	now(): Date {
		return this.current;
	}

	advance(ms: number): void {
		this.current = new Date(this.current.getTime() + ms);
	}
}

export class SequenceIds implements IdGenerator {
	private count = 0;

	next(): string {
		this.count += 1;
		return `id-${this.count}`;
	}
}

export interface TestServices {
	readonly tasks: TaskService;
	readonly lists: ListService;
}

export function createServices(clock = new FixedClock()): TestServices {
	const tasks = new InMemoryTaskRepository();
	const lists = new InMemoryTodoListRepository();
	const ids = new SequenceIds();
	return {
		tasks: new TaskService(tasks, lists, ids, clock),
		lists: new ListService(lists, tasks, ids, clock),
	};
}

export function createService(clock = new FixedClock()): TaskService {
	return createServices(clock).tasks;
}
