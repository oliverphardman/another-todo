import { InMemoryRepository } from "./in-memory-repository";
import type { TodoList } from "./todo-list";
import type { TodoListRepository } from "./todo-list-repository";

export class InMemoryTodoListRepository
	extends InMemoryRepository<TodoList>
	implements TodoListRepository {}
