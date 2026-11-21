import { InMemoryRepository } from "./in-memory-repository";
import type { TodoList } from "../../domain/todo-list";
import type { TodoListRepository } from "../../domain/todo-list-repository";

export class InMemoryTodoListRepository
	extends InMemoryRepository<TodoList>
	implements TodoListRepository {}
