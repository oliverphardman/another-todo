import { Router } from "express";
import type { AttachmentService } from "../application/attachment-service";
import type { components } from "../generated/api";
import { RouteSupport } from "./route-support";

type CreateAttachmentBody = components["schemas"]["CreateAttachment"];

export class AttachmentController {
	constructor(private readonly service: AttachmentService) {}

	router(): Router {
		const router = Router();
		router.get(
			"/:taskId/attachments",
			RouteSupport.wrap(async (request, response) => {
				const attachments = await this.service.list(
					RouteSupport.ownerOf(response),
					request.params.taskId!,
				);
				response.json({
					attachments: attachments.map(({ attachment, url }) => attachment.toView(url)),
				});
			}),
		);
		router.post(
			"/:taskId/attachments",
			RouteSupport.wrap(async (request, response) => {
				const { attachment, url, upload } = await this.service.create(
					RouteSupport.ownerOf(response),
					request.params.taskId!,
					request.body as CreateAttachmentBody,
				);
				response.status(201).json({ attachment: attachment.toView(url), upload });
			}),
		);
		router.delete(
			"/:taskId/attachments/:id",
			RouteSupport.wrap(async (request, response) => {
				await this.service.delete(
					RouteSupport.ownerOf(response),
					request.params.taskId!,
					request.params.id!,
				);
				response.status(204).end();
			}),
		);
		return router;
	}
}
