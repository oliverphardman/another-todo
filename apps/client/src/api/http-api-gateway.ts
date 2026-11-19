import type { components } from "../generated/api";
import type { TaskChanges, TaskData } from "../domain/task";
import type { TodoListData } from "../domain/todo-list";
import type { ApiGateway } from "./api-gateway";
import { ApiError, NetworkError } from "./errors";

export interface TokenProvider {
	getAccessToken(): Promise<string>;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type TaskDto = components["schemas"]["Task"];
type TodoListDto = components["schemas"]["TodoList"];

export class HttpApiGateway implements ApiGateway {
	constructor(
		private readonly baseUrl: string,
		private readonly tokens: TokenProvider,
		private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
	) {}

	async listLists(): Promise<TodoListData[]> {
		const body = await this.request<components["schemas"]["TodoListCollection"]>("GET", "/lists");
		return body.lists.map((list: TodoListDto) => ({ ...list }));
	}

	async createList(list: TodoListData): Promise<void> {
		await this.request("POST", "/lists", { id: list.id, name: list.name });
	}

	async renameList(id: string, name: string): Promise<void> {
		await this.request("PATCH", `/lists/${encodeURIComponent(id)}`, { name });
	}

	async deleteList(id: string): Promise<void> {
		await this.request("DELETE", `/lists/${encodeURIComponent(id)}`);
	}

	async listTasks(): Promise<TaskData[]> {
		const body = await this.request<components["schemas"]["TaskList"]>("GET", "/tasks");
		return body.tasks.map((task: TaskDto) => ({ ...task }));
	}

	async createTask(task: TaskData): Promise<void> {
		await this.request("POST", "/tasks", {
			id: task.id,
			title: task.title,
			completed: task.completed,
			importance: task.importance,
			listId: task.listId,
			myDay: task.myDay,
			dueDate: task.dueDate,
		});
	}

	async updateTask(id: string, changes: TaskChanges): Promise<void> {
		await this.request("PATCH", `/tasks/${encodeURIComponent(id)}`, changes);
	}

	async deleteTask(id: string): Promise<void> {
		await this.request("DELETE", `/tasks/${encodeURIComponent(id)}`);
	}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const token = await this.tokens.getAccessToken();
		let response: Response;
		try {
			response = await this.fetcher(`${this.baseUrl}${path}`, {
				method,
				headers: {
					authorization: `Bearer ${token}`,
					...(body !== undefined && { "content-type": "application/json" }),
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
		} catch {
			throw new NetworkError();
		}
		if (!response.ok) {
			throw new ApiError(response.status, await HttpApiGateway.messageOf(response));
		}
		return (response.status === 204 ? undefined : await response.json()) as T;
	}

	private static async messageOf(response: Response): Promise<string> {
		try {
			const payload = (await response.json()) as { error?: string };
			return payload.error ?? response.statusText;
		} catch {
			return response.statusText;
		}
	}
}
