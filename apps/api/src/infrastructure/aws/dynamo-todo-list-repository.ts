import { TodoList, type TodoListRecord } from "../../domain/todo-list";
import type { TodoListRepository } from "../../domain/todo-list-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoTodoListRepository
	extends DynamoRepository<TodoList, TodoListRecord>
	implements TodoListRepository
{
	protected toRecord(list: TodoList): TodoListRecord {
		return list.toRecord();
	}

	protected restore(record: TodoListRecord): TodoList {
		return TodoList.restore(record);
	}
}
