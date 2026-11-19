import { Router } from "express";
import type { ListService } from "../application/list-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type CreateListBody = components["schemas"]["CreateList"];
type UpdateListBody = components["schemas"]["UpdateList"];

export class ListController {
	constructor(private readonly service: ListService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/",
			RouteSupport.wrap(async (_request, response) => {
				const lists = await this.service.list(RouteSupport.ownerOf(response));
				response.json({ lists: lists.map((list) => list.toJSON()) });
			}),
		);
		router.post(
			"/",
			RouteSupport.wrap(async (request, response) => {
				const list = await this.service.create(
					RouteSupport.ownerOf(response),
					request.body as CreateListBody,
				);
				response.status(201).json(list.toJSON());
			}),
		);
		router.get(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const list = await this.service.get(RouteSupport.ownerOf(response), request.params.id!);
				response.json(list.toJSON());
			}),
		);
		router.patch(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const list = await this.service.rename(
					RouteSupport.ownerOf(response),
					request.params.id!,
					request.body as UpdateListBody,
				);
				response.json(list.toJSON());
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
