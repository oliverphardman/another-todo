import type {
	RemoteList,
	RemoteStep,
	RemoteTask,
	RemoteTaskContent,
	RemoteTodo,
} from "./remote-todo";

export interface GraphTokenProvider {
	accessToken(): Promise<string>;
}

export type GraphFetcher = (url: string, init?: RequestInit) => Promise<Response>;

interface GraphList {
	readonly id: string;
	readonly displayName: string;
	readonly wellknownListName?: string;
}

interface GraphChecklistItem {
	readonly id: string;
	readonly displayName: string;
	readonly isChecked: boolean;
}

interface GraphTask {
	readonly id: string;
	readonly title: string;
	readonly status: string;
	readonly importance: string;
	readonly dueDateTime?: { readonly dateTime: string } | null;
	readonly body?: { readonly content?: string } | null;
	readonly checklistItems?: readonly GraphChecklistItem[];
}

interface Page<T> {
	readonly value: readonly T[];
	readonly "@odata.nextLink"?: string;
}

const BASE = "https://graph.microsoft.com/v1.0/me/todo/lists";

export class GraphError extends Error {
	constructor(readonly status: number) {
		super(`Microsoft Graph returned ${status}`);
		this.name = "GraphError";
	}
}

export class GraphTodoGateway implements RemoteTodo {
	constructor(
		private readonly tokens: GraphTokenProvider,
		private readonly fetcher: GraphFetcher = (url, init) => fetch(url, init),
	) {}

	async lists(): Promise<RemoteList[]> {
		const lists = await this.pages<GraphList>(BASE);
		return lists.map((list) => ({
			id: list.id,
			name: list.displayName,
			isDefault: list.wellknownListName === "defaultList",
		}));
	}

	async createList(name: string): Promise<RemoteList> {
		const created = await this.send<GraphList>("POST", BASE, { displayName: name });
		return { id: created.id, name: created.displayName, isDefault: false };
	}

	async renameList(listId: string, name: string): Promise<void> {
		await this.send("PATCH", `${BASE}/${encodeURIComponent(listId)}`, { displayName: name });
	}

	async deleteList(listId: string): Promise<void> {
		await this.send("DELETE", `${BASE}/${encodeURIComponent(listId)}`);
	}

	async tasks(listId: string): Promise<RemoteTask[]> {
		const tasks = await this.pages<GraphTask>(
			`${BASE}/${encodeURIComponent(listId)}/tasks?$expand=checklistItems`,
		);
		return tasks.map((task) => GraphTodoGateway.toRemote(task));
	}

	async createTask(listId: string, content: RemoteTaskContent): Promise<RemoteTask> {
		const created = await this.send<GraphTask>(
			"POST",
			`${BASE}/${encodeURIComponent(listId)}/tasks`,
			GraphTodoGateway.toBody(content),
		);
		const steps = await this.createSteps(listId, created.id, content);
		return { ...GraphTodoGateway.toRemote(created), steps };
	}

	async updateTask(listId: string, task: RemoteTask, content: RemoteTaskContent): Promise<void> {
		const path = `${BASE}/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(task.id)}`;
		await this.send("PATCH", path, GraphTodoGateway.toBody(content));
		const unchanged =
			task.steps.length === content.steps.length &&
			task.steps.every(
				(step, index) =>
					step.title === content.steps[index]!.title &&
					step.completed === content.steps[index]!.completed,
			);
		if (!unchanged) {
			for (const step of task.steps) {
				await this.send("DELETE", `${path}/checklistItems/${encodeURIComponent(step.id)}`);
			}
			await this.createSteps(listId, task.id, content);
		}
	}

	async deleteTask(listId: string, taskId: string): Promise<void> {
		await this.send(
			"DELETE",
			`${BASE}/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
		);
	}

	private async createSteps(
		listId: string,
		taskId: string,
		content: RemoteTaskContent,
	): Promise<RemoteStep[]> {
		const path = `${BASE}/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}/checklistItems`;
		const steps: RemoteStep[] = [];
		for (const step of content.steps) {
			const created = await this.send<GraphChecklistItem>("POST", path, {
				displayName: step.title,
				isChecked: step.completed,
			});
			steps.push({ id: created.id, title: created.displayName, completed: created.isChecked });
		}
		return steps;
	}

	private static toRemote(task: GraphTask): RemoteTask {
		return {
			id: task.id,
			title: task.title,
			completed: task.status === "completed",
			important: task.importance === "high",
			dueDay: task.dueDateTime?.dateTime.slice(0, 10) ?? null,
			note: task.body?.content ?? "",
			steps: (task.checklistItems ?? []).map((item) => ({
				id: item.id,
				title: item.displayName,
				completed: item.isChecked,
			})),
		};
	}

	private static toBody(content: RemoteTaskContent): Record<string, unknown> {
		return {
			title: content.title,
			status: content.completed ? "completed" : "notStarted",
			importance: content.important ? "high" : "normal",
			body: { content: content.note, contentType: "text" },
			dueDateTime:
				content.dueDay === null
					? null
					: { dateTime: `${content.dueDay}T00:00:00.0000000`, timeZone: "UTC" },
		};
	}

	private async pages<T>(first: string): Promise<T[]> {
		const items: T[] = [];
		let next: string | undefined = first;
		while (next !== undefined) {
			const page: Page<T> = await this.send<Page<T>>("GET", next);
			items.push(...page.value);
			next = page["@odata.nextLink"];
		}
		return items;
	}

	private async send<T>(method: string, url: string, body?: unknown): Promise<T> {
		const response = await this.fetcher(url, {
			method,
			headers: {
				authorization: `Bearer ${await this.tokens.accessToken()}`,
				...(body === undefined ? {} : { "content-type": "application/json" }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});
		if (!response.ok) {
			throw new GraphError(response.status);
		}
		const text = await response.text();
		return (text === "" ? undefined : JSON.parse(text)) as T;
	}
}
