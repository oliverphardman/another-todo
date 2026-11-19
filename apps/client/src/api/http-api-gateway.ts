import type { components } from "../generated/api";
import type { TaskChanges, TaskData } from "../domain/task";
import type { GroupData } from "../domain/group";
import type { TodoListData } from "../domain/todo-list";
import type { ViewSettingsData } from "../domain/view-settings";
import type { ApiGateway } from "./api-gateway";
import { AuthorizedHttp, type Fetcher, type TokenProvider } from "./authorized-http";

export type { TokenProvider } from "./authorized-http";
type TaskDto = components["schemas"]["Task"];
type TodoListDto = components["schemas"]["TodoList"];

export class HttpApiGateway implements ApiGateway {
	private readonly http: AuthorizedHttp;

	constructor(baseUrl: string, tokens: TokenProvider, fetcher?: Fetcher) {
		this.http = new AuthorizedHttp(baseUrl, tokens, fetcher);
	}

	async listLists(): Promise<TodoListData[]> {
		const body = await this.http.request<components["schemas"]["TodoListCollection"]>(
			"GET",
			"/lists",
		);
		return body.lists.map((list: TodoListDto) => ({ ...list }));
	}

	async createList(list: TodoListData): Promise<void> {
		await this.http.request("POST", "/lists", { id: list.id, name: list.name });
	}

	async renameList(id: string, name: string): Promise<void> {
		await this.http.request("PATCH", `/lists/${encodeURIComponent(id)}`, { name });
	}

	async listGroups(): Promise<GroupData[]> {
		const body = await this.http.request<components["schemas"]["GroupCollection"]>(
			"GET",
			"/groups",
		);
		return body.groups.map((group) => ({ ...group }));
	}

	async createGroup(group: GroupData): Promise<void> {
		await this.http.request("POST", "/groups", { id: group.id, name: group.name });
	}

	async renameGroup(id: string, name: string): Promise<void> {
		await this.http.request("PATCH", `/groups/${encodeURIComponent(id)}`, { name });
	}

	async deleteGroup(id: string): Promise<void> {
		await this.http.request("DELETE", `/groups/${encodeURIComponent(id)}`);
	}

	async setListGroup(listId: string, groupId: string | null): Promise<void> {
		await this.http.request("PATCH", `/lists/${encodeURIComponent(listId)}`, { groupId });
	}

	async moveList(id: string, position: number): Promise<void> {
		await this.http.request("PATCH", `/lists/${encodeURIComponent(id)}`, { position });
	}

	async deleteList(id: string): Promise<void> {
		await this.http.request("DELETE", `/lists/${encodeURIComponent(id)}`);
	}

	async listSettings(): Promise<ViewSettingsData[]> {
		const body = await this.http.request<components["schemas"]["ViewSettingsCollection"]>(
			"GET",
			"/view-settings",
		);
		return body.settings.map((entry) => ({
			id: entry.id,
			sort: entry.sort ?? null,
			sortDescending: entry.sortDescending,
			hideCompleted: entry.hideCompleted,
			theme: (entry.theme ?? null) as ViewSettingsData["theme"],
		}));
	}

	async putSettings(settings: ViewSettingsData): Promise<void> {
		await this.http.request("PUT", `/view-settings/${encodeURIComponent(settings.id)}`, {
			sort: settings.sort,
			sortDescending: settings.sortDescending ?? false,
			hideCompleted: settings.hideCompleted,
			theme: settings.theme,
		});
	}

	async listTasks(): Promise<TaskData[]> {
		const body = await this.http.request<components["schemas"]["TaskList"]>("GET", "/tasks");
		return body.tasks.map((task: TaskDto) => ({ ...task }));
	}

	async createTask(task: TaskData): Promise<void> {
		await this.http.request("POST", "/tasks", {
			id: task.id,
			title: task.title,
			completed: task.completed,
			importance: task.importance,
			listId: task.listId,
			myDay: task.myDay,
			myDayDismissed: task.myDayDismissed,
			steps: task.steps,
			note: task.note,
			dueDate: task.dueDate,
		});
	}

	async updateTask(id: string, changes: TaskChanges): Promise<void> {
		await this.http.request("PATCH", `/tasks/${encodeURIComponent(id)}`, changes);
	}

	async deleteTask(id: string): Promise<void> {
		await this.http.request("DELETE", `/tasks/${encodeURIComponent(id)}`);
	}
}
