import { Router } from "express";
import type { AuthenticationMode } from "../composition/platform";

export interface PublicConfig {
	readonly authentication: AuthenticationMode;
	readonly notice: string | null;
}

export class ConfigController {
	constructor(private readonly config: PublicConfig) {}

	router(): Router {
		const router = Router();
		router.get("/config", (_request, response) => {
			response.json(this.config);
		});
		return router;
	}
}
