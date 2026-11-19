import type { Task } from "./task";

export interface TaskRepository {
	save(task: Task): Promise<void>;
	findById(ownerId: string, id: string): Promise<Task | null>;
	list(ownerId: string): Promise<Task[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
