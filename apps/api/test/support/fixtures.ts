import type { Clock, IdGenerator } from "../../src/application/ports";
import { InMemoryTaskRepository } from "../../src/domain/in-memory-task-repository";
import { TaskService } from "../../src/application/task-service";

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

export function createService(clock = new FixedClock()): TaskService {
	return new TaskService(new InMemoryTaskRepository(), new SequenceIds(), clock);
}
