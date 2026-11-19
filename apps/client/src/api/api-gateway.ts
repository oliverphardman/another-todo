import type { TaskChanges, TaskData } from "../domain/task";
import type { GroupData } from "../domain/group";
import type { TodoListData } from "../domain/todo-list";
import type { ViewSettingsData } from "../domain/view-settings";

export interface ApiGateway {
	listLists(): Promise<TodoListData[]>;
	createList(list: TodoListData): Promise<void>;
	listGroups(): Promise<GroupData[]>;
	createGroup(group: GroupData): Promise<void>;
	renameGroup(id: string, name: string): Promise<void>;
	deleteGroup(id: string): Promise<void>;
	setListGroup(listId: string, groupId: string | null): Promise<void>;
	moveList(id: string, position: number): Promise<void>;
	renameList(id: string, name: string): Promise<void>;
	deleteList(id: string): Promise<void>;
	listSettings(): Promise<ViewSettingsData[]>;
	putSettings(settings: ViewSettingsData): Promise<void>;
	listTasks(): Promise<TaskData[]>;
	createTask(task: TaskData): Promise<void>;
	updateTask(id: string, changes: TaskChanges): Promise<void>;
	deleteTask(id: string): Promise<void>;
}
