import { Router } from "express";
import type { PhotoService } from "../application/photo-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type CreatePhotoBody = components["schemas"]["CreatePhoto"];

export class PhotoController {
	constructor(private readonly service: PhotoService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/",
			RouteSupport.wrap(async (_request, response) => {
				const photos = await this.service.list(RouteSupport.ownerOf(response));
				response.json({ photos: photos.map(({ photo, url }) => photo.toView(url)) });
			}),
		);
		router.post(
			"/",
			RouteSupport.wrap(async (request, response) => {
				const { photo, url, upload } = await this.service.create(
					RouteSupport.ownerOf(response),
					request.body as CreatePhotoBody,
				);
				response.status(201).json({ photo: photo.toView(url), upload });
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
