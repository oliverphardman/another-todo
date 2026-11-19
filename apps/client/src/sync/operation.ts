import type { TaskChanges, TaskData } from "../domain/task";
import type { TodoListData } from "../domain/todo-list";

export type OperationBody =
	| {
			readonly kind: "createList";
			readonly opId: string;
			readonly list: TodoListData;
	  }
	| {
			readonly kind: "renameList";
			readonly opId: string;
			readonly listId: string;
			readonly name: string;
	  }
	| {
			readonly kind: "deleteList";
			readonly opId: string;
			readonly listId: string;
	  }
	| {
			readonly kind: "createTask";
			readonly opId: string;
			readonly task: TaskData;
	  }
	| {
			readonly kind: "updateTask";
			readonly opId: string;
			readonly taskId: string;
			readonly changes: TaskChanges;
	  }
	| {
			readonly kind: "deleteTask";
			readonly opId: string;
			readonly taskId: string;
	  };

export type Operation = OperationBody & { readonly sending?: boolean };
