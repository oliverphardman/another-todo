import type { Task } from "./task";
import type { TaskRepository } from "./task-repository";

export class InMemoryTaskRepository implements TaskRepository {
	private readonly tasks = new Map<string, Task>();

	async save(task: Task): Promise<void> {
		this.tasks.set(task.id, task);
	}

	async findById(id: string): Promise<Task | null> {
		return this.tasks.get(id) ?? null;
	}

	async list(): Promise<Task[]> {
		return [...this.tasks.values()];
	}

	async delete(id: string): Promise<void> {
		this.tasks.delete(id);
	}
}
