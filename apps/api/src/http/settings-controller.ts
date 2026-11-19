import { Router } from "express";
import type { ViewSettingsService } from "../application/view-settings-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type PutViewSettingsBody = components["schemas"]["PutViewSettings"];

export class SettingsController {
	constructor(private readonly service: ViewSettingsService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/",
			RouteSupport.wrap(async (_request, response) => {
				const settings = await this.service.list(RouteSupport.ownerOf(response));
				response.json({ settings: settings.map((entry) => entry.toJSON()) });
			}),
		);
		router.put(
			"/:id",
			RouteSupport.wrap(async (request, response) => {
				const settings = await this.service.put(
					RouteSupport.ownerOf(response),
					request.params.id!,
					request.body as PutViewSettingsBody,
				);
				response.json(settings.toJSON());
			}),
		);
		return router;
	}
}
