import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Authenticator } from "./authenticator";

export type AsyncRoute = (request: Request, response: Response) => Promise<void>;

export class RouteSupport {
	static wrap(route: AsyncRoute): RequestHandler {
		return (request, response, next) => {
			route(request, response).catch(next);
		};
	}

	static authenticate(authenticator: Authenticator): RequestHandler {
		return (request: Request, response: Response, next: NextFunction) => {
			response.locals.ownerId = authenticator.subjectOf(request);
			next();
		};
	}

	static ownerOf(response: Response): string {
		return response.locals.ownerId as string;
	}
}
