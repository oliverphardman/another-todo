import type { TodoList } from "./todo-list";

export interface TodoListRepository {
	save(list: TodoList): Promise<void>;
	findById(ownerId: string, id: string): Promise<TodoList | null>;
	list(ownerId: string): Promise<TodoList[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
