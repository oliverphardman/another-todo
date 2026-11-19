import { Router, type Response } from "express";
import type { ListService } from "../application/list-service";
import type { ShareService } from "../application/share-service";
import type { TodoList } from "../domain/todo-list";
import type { components } from "../generated/api";
import { ListPresenter } from "./list-presenter";
import { RouteSupport } from "./route-support";

type CreateListBody = components["schemas"]["CreateList"];
type UpdateListBody = components["schemas"]["UpdateList"];

export class ListController {
	constructor(
		private readonly service: ListService,
		private readonly shares: ShareService,
	) {}

	router(): Router {
		const router = Router();
		router.get(
			"/",
			RouteSupport.wrap(async (_request, response) => {
				const lists = await this.service.list(RouteSupport.ownerOf(response));
				const keys = await this.shares.sharedKeys(RouteSupport.ownerOf(response));
				response.json({
					lists: lists.map((list) =>
						ListPresenter.present(list, RouteSupport.ownerOf(response), keys),
					),
				});
			}),
		);
		router.post(
			"/",
			RouteSupport.wrap(async (request, response) => {
				const list = await this.service.create(
					RouteSupport.ownerOf(response),
					request.body as CreateListBody,
				);
				response.status(201).json(await this.present(list, response));
			}),
		);
		router.get(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const list = await this.service.get(RouteSupport.ownerOf(response), request.params.id!);
				response.json(await this.present(list, response));
			}),
		);
		router.patch(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const list = await this.service.update(
					RouteSupport.ownerOf(response),
					request.params.id!,
					request.body as UpdateListBody,
				);
				response.json(await this.present(list, response));
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

	private async present(list: TodoList, response: Response) {
		const userId = RouteSupport.ownerOf(response);
		return ListPresenter.present(list, userId, await this.shares.sharedKeys(userId));
	}
}
