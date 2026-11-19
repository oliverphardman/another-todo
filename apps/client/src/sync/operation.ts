import type { GroupData } from "../domain/group";
import type { TaskChanges, TaskData } from "../domain/task";
import type { TodoListData } from "../domain/todo-list";
import type { ViewSettingsData } from "../domain/view-settings";

export type OperationBody =
	| {
			readonly kind: "putSettings";
			readonly opId: string;
			readonly settings: ViewSettingsData;
	  }
	| {
			readonly kind: "createGroup";
			readonly opId: string;
			readonly group: GroupData;
	  }
	| {
			readonly kind: "renameGroup";
			readonly opId: string;
			readonly groupId: string;
			readonly name: string;
	  }
	| {
			readonly kind: "deleteGroup";
			readonly opId: string;
			readonly groupId: string;
	  }
	| {
			readonly kind: "setListGroup";
			readonly opId: string;
			readonly listId: string;
			readonly groupId: string | null;
	  }
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
			readonly kind: "moveList";
			readonly opId: string;
			readonly listId: string;
			readonly position: number;
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
