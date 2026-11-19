import type { Task } from "./task";

export interface TaskRepository {
	save(task: Task): Promise<void>;
	findById(id: string): Promise<Task | null>;
	list(): Promise<Task[]>;
	delete(id: string): Promise<void>;
}
