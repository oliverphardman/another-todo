import { UnauthorizedError } from "../domain/errors";

export interface HttpEvent {
	readonly rawPath: string;
	readonly body?: string | null;
	readonly isBase64Encoded?: boolean;
	readonly requestContext: {
		readonly domainName: string;
		readonly http: { readonly method: string };
		readonly authorizer?: {
			readonly jwt?: { readonly claims?: Record<string, unknown> };
		};
	};
}

export interface HttpResult {
	readonly statusCode: number;
	readonly headers: Record<string, string>;
	readonly body: string;
}

export interface RouteHandler {
	canHandle(path: string): boolean;
	handle(event: HttpEvent): Promise<HttpResult>;
}

export class HttpResponses {
	static json(statusCode: number, payload: unknown): HttpResult {
		return {
			statusCode,
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		};
	}

	static empty(statusCode: number): HttpResult {
		return { statusCode, headers: {}, body: "" };
	}
}

export class Principal {
	static subjectOf(event: HttpEvent): string {
		const subject = event.requestContext.authorizer?.jwt?.claims?.sub;
		if (typeof subject !== "string" || subject.length === 0) {
			throw new UnauthorizedError("Authentication required");
		}
		return subject;
	}
}

export class RequestBody {
	static text(event: HttpEvent): string {
		const raw = event.body ?? "";
		return event.isBase64Encoded === true ? Buffer.from(raw, "base64").toString("utf8") : raw;
	}
}
