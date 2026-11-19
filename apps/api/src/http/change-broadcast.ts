import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ChangeNotifier } from "../application/change-notifier";
import { RouteSupport } from "./route-support";

export class ChangeBroadcast {
	constructor(private readonly notifier: ChangeNotifier) {}

	middleware(): RequestHandler {
		return (request: Request, response: Response, next: NextFunction) => {
			if (request.method === "GET") {
				next();
				return;
			}
			const end = response.end.bind(response) as (...args: unknown[]) => Response;
			response.end = ((...args: unknown[]) => {
				if (response.statusCode >= 400) {
					return end(...args);
				}
				void this.notifier
					.notify(RouteSupport.ownerOf(response))
					.catch(() => undefined)
					.then(() => end(...args));
				return response;
			}) as Response["end"];
			next();
		};
	}
}
