import { getCurrentInvoke } from "@codegenie/serverless-express";
import type { Request } from "express";
import { UnauthorizedError } from "../domain/errors";

export interface Authenticator {
	subjectOf(request: Request): string;
}

export class ApiGatewayAuthenticator implements Authenticator {
	subjectOf(_request: Request): string {
		const claims = getCurrentInvoke().event?.requestContext?.authorizer?.jwt?.claims;
		const subject = claims?.sub;
		if (typeof subject !== "string" || subject.length === 0) {
			throw new UnauthorizedError("Authentication required");
		}
		return subject;
	}
}
