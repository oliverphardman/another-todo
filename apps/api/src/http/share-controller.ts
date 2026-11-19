import { Router } from "express";
import type { ShareService } from "../application/share-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type CreateShareBody = components["schemas"]["CreateShare"];

export class ShareController {
	constructor(private readonly service: ShareService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/:id/shares",
			RouteSupport.wrap(async (request, response) => {
				const shares = await this.service.list(RouteSupport.ownerOf(response), request.params.id!);
				response.json({ shares: shares.map((share) => share.toJSON()) });
			}),
		);
		router.post(
			"/:id/shares",
			RouteSupport.wrap(async (request, response) => {
				const share = await this.service.add(
					RouteSupport.ownerOf(response),
					request.params.id!,
					(request.body as CreateShareBody).email,
				);
				response.status(201).json(share.toJSON());
			}),
		);
		router.delete(
			"/:id/shares/:memberId",
			RouteSupport.wrap(async (request, response) => {
				await this.service.remove(
					RouteSupport.ownerOf(response),
					request.params.id!,
					request.params.memberId!,
				);
				response.status(204).end();
			}),
		);
		return router;
	}
}
