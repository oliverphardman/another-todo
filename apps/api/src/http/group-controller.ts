import { Router } from "express";
import type { GroupService } from "../application/group-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type CreateGroupBody = components["schemas"]["CreateGroup"];
type UpdateGroupBody = components["schemas"]["UpdateGroup"];

export class GroupController {
	constructor(private readonly service: GroupService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/",
			RouteSupport.wrap(async (_request, response) => {
				const groups = await this.service.list(RouteSupport.ownerOf(response));
				response.json({ groups: groups.map((group) => group.toJSON()) });
			}),
		);
		router.post(
			"/",
			RouteSupport.wrap(async (request, response) => {
				const group = await this.service.create(
					RouteSupport.ownerOf(response),
					request.body as CreateGroupBody,
				);
				response.status(201).json(group.toJSON());
			}),
		);
		router.get(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const group = await this.service.get(RouteSupport.ownerOf(response), request.params.id!);
				response.json(group.toJSON());
			}),
		);
		router.patch(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const group = await this.service.update(
					RouteSupport.ownerOf(response),
					request.params.id!,
					request.body as UpdateGroupBody,
				);
				response.json(group.toJSON());
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
