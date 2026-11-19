import type { ListService } from "../application/list-service";
import type { TaskInput } from "../application/task-changes";
import type { TaskService } from "../application/task-service";
import { ValidationError } from "../domain/errors";

export type ToolArguments = Record<string, unknown>;

const TASK_PROPERTIES = {
	title: { type: "string", description: "Task title" },
	completed: { type: "boolean", description: "Whether the task is done" },
	importance: { type: "string", enum: ["normal", "high"] },
	listId: { type: ["string", "null"], description: "Id of the list the task belongs to" },
	dueDate: { type: ["string", "null"], description: "ISO 8601 date or null" },
};

const ID_PROPERTY = { id: { type: "string", description: "Resource id" } };
const NAME_PROPERTY = { name: { type: "string", description: "List name" } };

export abstract class McpTool {
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly inputSchema: Record<string, unknown>;

	constructor(
		protected readonly tasks: TaskService,
		protected readonly lists: ListService,
	) {}

	abstract execute(ownerId: string, args: ToolArguments): Promise<unknown>;

	protected requireId(args: ToolArguments): string {
		if (typeof args.id !== "string" || args.id.length === 0) {
			throw new ValidationError("id is required");
		}
		return args.id;
	}

	protected changes(args: ToolArguments): TaskInput {
		const { id: _id, ...rest } = args;
		return rest;
	}
}

export class ListTasksTool extends McpTool {
	readonly name = "list_tasks";
	readonly description = "List the user's tasks, optionally only those in one list";
	readonly inputSchema = {
		type: "object",
		properties: { listId: { type: "string", description: "Only tasks in this list" } },
	};

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		const listId = typeof args.listId === "string" ? args.listId : undefined;
		return this.tasks.list(ownerId, listId);
	}
}

export class GetTaskTool extends McpTool {
	readonly name = "get_task";
	readonly description = "Get a task by id";
	readonly inputSchema = { type: "object", properties: ID_PROPERTY, required: ["id"] };

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		return this.tasks.get(ownerId, this.requireId(args));
	}
}

export class CreateTaskTool extends McpTool {
	readonly name = "create_task";
	readonly description = "Create a task";
	readonly inputSchema = { type: "object", properties: TASK_PROPERTIES, required: ["title"] };

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		return this.tasks.create(ownerId, this.changes(args));
	}
}

export class UpdateTaskTool extends McpTool {
	readonly name = "update_task";
	readonly description = "Update fields of a task, including moving it to another list";
	readonly inputSchema = {
		type: "object",
		properties: { ...ID_PROPERTY, ...TASK_PROPERTIES },
		required: ["id"],
	};

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		return this.tasks.update(ownerId, this.requireId(args), this.changes(args));
	}
}

export class CompleteTaskTool extends McpTool {
	readonly name = "complete_task";
	readonly description = "Mark a task as completed";
	readonly inputSchema = { type: "object", properties: ID_PROPERTY, required: ["id"] };

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		return this.tasks.update(ownerId, this.requireId(args), { completed: true });
	}
}

export class DeleteTaskTool extends McpTool {
	readonly name = "delete_task";
	readonly description = "Delete a task";
	readonly inputSchema = { type: "object", properties: ID_PROPERTY, required: ["id"] };

	async execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		await this.tasks.delete(ownerId, this.requireId(args));
		return { deleted: true };
	}
}

export class ListListsTool extends McpTool {
	readonly name = "list_lists";
	readonly description = "List the user's task lists";
	readonly inputSchema = { type: "object", properties: {} };

	execute(ownerId: string): Promise<unknown> {
		return this.lists.list(ownerId);
	}
}

export class CreateListTool extends McpTool {
	readonly name = "create_list";
	readonly description = "Create a task list";
	readonly inputSchema = { type: "object", properties: NAME_PROPERTY, required: ["name"] };

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		return this.lists.create(ownerId, args);
	}
}

export class RenameListTool extends McpTool {
	readonly name = "rename_list";
	readonly description = "Rename a task list";
	readonly inputSchema = {
		type: "object",
		properties: { ...ID_PROPERTY, ...NAME_PROPERTY },
		required: ["id", "name"],
	};

	execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		return this.lists.rename(ownerId, this.requireId(args), args);
	}
}

export class DeleteListTool extends McpTool {
	readonly name = "delete_list";
	readonly description = "Delete a task list and all tasks in it";
	readonly inputSchema = { type: "object", properties: ID_PROPERTY, required: ["id"] };

	async execute(ownerId: string, args: ToolArguments): Promise<unknown> {
		await this.lists.delete(ownerId, this.requireId(args));
		return { deleted: true };
	}
}

export function createTools(tasks: TaskService, lists: ListService): McpTool[] {
	return [
		new ListTasksTool(tasks, lists),
		new GetTaskTool(tasks, lists),
		new CreateTaskTool(tasks, lists),
		new UpdateTaskTool(tasks, lists),
		new CompleteTaskTool(tasks, lists),
		new DeleteTaskTool(tasks, lists),
		new ListListsTool(tasks, lists),
		new CreateListTool(tasks, lists),
		new RenameListTool(tasks, lists),
		new DeleteListTool(tasks, lists),
	];
}
