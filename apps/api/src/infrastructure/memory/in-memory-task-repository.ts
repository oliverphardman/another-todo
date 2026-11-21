import { InMemoryRepository } from "./in-memory-repository";
import type { Task } from "../../domain/task";
import type { TaskRepository } from "../../domain/task-repository";

export class InMemoryTaskRepository extends InMemoryRepository<Task> implements TaskRepository {}
