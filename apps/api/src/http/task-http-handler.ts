import { MethodNotAllowedError, ValidationError } from "../domain/errors";
import type { TaskInput } from "../application/task-changes";
import type { TaskService } from "../application/task-service";
import {
	HttpResponses,
	Principal,
	RequestBody,
	type HttpEvent,
	type HttpResult,
	type RouteHandler,
} from "./types";

const TASK_PATH = /^\/tasks(?:\/([^/]+))?$/;

export class TaskHttpHandler implements RouteHandler {
	constructor(private readonly service: TaskService) {}

	canHandle(path: string): boolean {
		return TASK_PATH.test(path);
	}

	async handle(event: HttpEvent): Promise<HttpResult> {
		const ownerId = Principal.subjectOf(event);
		const id = TASK_PATH.exec(event.rawPath)?.[1];
		const method = event.requestContext.http.method;
		if (id === undefined) {
			return this.handleCollection(method, ownerId, event);
		}
		return this.handleItem(method, ownerId, id, event);
	}

	private async handleCollection(
		method: string,
		ownerId: string,
		event: HttpEvent,
	): Promise<HttpResult> {
		if (method === "GET") {
			return HttpResponses.json(200, { tasks: await this.service.list(ownerId) });
		}
		if (method === "POST") {
			return HttpResponses.json(201, await this.service.create(ownerId, this.parseBody(event)));
		}
		throw new MethodNotAllowedError(`${method} is not allowed on /tasks`);
	}

	private async handleItem(
		method: string,
		ownerId: string,
		id: string,
		event: HttpEvent,
	): Promise<HttpResult> {
		if (method === "GET") {
			return HttpResponses.json(200, await this.service.get(ownerId, id));
		}
		if (method === "PATCH") {
			return HttpResponses.json(200, await this.service.update(ownerId, id, this.parseBody(event)));
		}
		if (method === "DELETE") {
			await this.service.delete(ownerId, id);
			return HttpResponses.empty(204);
		}
		throw new MethodNotAllowedError(`${method} is not allowed on /tasks/{id}`);
	}

	private parseBody(event: HttpEvent): TaskInput {
		let parsed: unknown;
		try {
			parsed = JSON.parse(RequestBody.text(event));
		} catch {
			throw new ValidationError("Body must be valid JSON");
		}
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			throw new ValidationError("Body must be a JSON object");
		}
		return parsed as TaskInput;
	}
}
