import { InMemoryRepository } from "./in-memory-repository";
import type { Task } from "./task";
import type { TaskRepository } from "./task-repository";

export class InMemoryTaskRepository extends InMemoryRepository<Task> implements TaskRepository {}
