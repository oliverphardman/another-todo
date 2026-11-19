import type { ErrorRequestHandler } from "express";
import { NotFoundError, UnauthorizedError, ValidationError } from "../domain/errors";

interface ErrorDescription {
	readonly status: number;
	readonly message: string;
}

export class ErrorHandler {
	middleware(): ErrorRequestHandler {
		return (error, _request, response, _next) => {
			const { status, message } = ErrorHandler.describe(error);
			response.status(status).json({ error: message });
		};
	}

	private static describe(error: unknown): ErrorDescription {
		if (error instanceof ValidationError) {
			return { status: 400, message: error.message };
		}
		if (error instanceof UnauthorizedError) {
			return { status: 401, message: error.message };
		}
		if (error instanceof NotFoundError) {
			return { status: 404, message: error.message };
		}
		const { status, message } = error as { status?: unknown; message?: unknown };
		if (typeof status === "number" && status >= 400 && status < 500) {
			return { status, message: String(message) };
		}
		return { status: 500, message: "Internal server error" };
	}
}
