import type { Task } from "./task";
import type { TaskRepository } from "./task-repository";

export class InMemoryTaskRepository implements TaskRepository {
	private readonly tasks = new Map<string, Task>();

	private static key(ownerId: string, id: string): string {
		return `${ownerId}#${id}`;
	}

	async save(task: Task): Promise<void> {
		this.tasks.set(InMemoryTaskRepository.key(task.ownerId, task.id), task);
	}

	async findById(ownerId: string, id: string): Promise<Task | null> {
		return this.tasks.get(InMemoryTaskRepository.key(ownerId, id)) ?? null;
	}

	async list(ownerId: string): Promise<Task[]> {
		return [...this.tasks.values()].filter((task) => task.ownerId === ownerId);
	}

	async delete(ownerId: string, id: string): Promise<void> {
		this.tasks.delete(InMemoryTaskRepository.key(ownerId, id));
	}
}
