import { Router } from "express";
import type { DefaultSettingsData } from "../application/default-settings";
import type { AuthenticationMode, SignIn } from "../composition/platform";

export interface PublicConfig {
	readonly authentication: AuthenticationMode;
	readonly providers: readonly string[];
	readonly notice: string | null;
	readonly realtimeUrl: string | null;
	readonly signIn: SignIn | null;
	readonly maxUploadBytes: number;
	readonly defaultSettings: DefaultSettingsData;
}

export class ConfigController {
	constructor(private readonly config: PublicConfig) {}

	router(): Router {
		const router = Router();
		router.get("/config", (_request, response) => {
			response.json({ ...this.config, presetThemes: true });
		});
		return router;
	}
}
