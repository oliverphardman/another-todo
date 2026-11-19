import { Router } from "express";
import type { TaskService } from "../application/task-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type CreateTaskBody = components["schemas"]["CreateTask"];
type UpdateTaskBody = components["schemas"]["UpdateTask"];

export class TaskController {
	constructor(private readonly service: TaskService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/",
			RouteSupport.wrap(async (_request, response) => {
				const tasks = await this.service.list(RouteSupport.ownerOf(response));
				response.json({ tasks: tasks.map((task) => task.toJSON()) });
			}),
		);
		router.post(
			"/",
			RouteSupport.wrap(async (request, response) => {
				const body = request.body as CreateTaskBody;
				const task = await this.service.create(RouteSupport.ownerOf(response), body);
				response.status(201).json(task.toJSON());
			}),
		);
		router.get(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const task = await this.service.get(RouteSupport.ownerOf(response), request.params.id!);
				response.json(task.toJSON());
			}),
		);
		router.patch(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const body = request.body as UpdateTaskBody;
				const task = await this.service.update(
					RouteSupport.ownerOf(response),
					request.params.id!,
					body,
				);
				response.json(task.toJSON());
			}),
		);
		router.delete(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				await this.service.delete(RouteSupport.ownerOf(response), request.params.id!);
				response.status(204).end();
			}),
		);
		return router;
	}
}
