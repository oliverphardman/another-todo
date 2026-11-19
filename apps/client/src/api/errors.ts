export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}

	get isPermanent(): boolean {
		return this.status >= 400 && this.status < 500 && this.status !== 408 && this.status !== 429;
	}
}

export class NetworkError extends Error {
	constructor(message = "The server could not be reached") {
		super(message);
		this.name = "NetworkError";
	}
}

export class AuthRequiredError extends Error {
	constructor(message = "Sign in required") {
		super(message);
		this.name = "AuthRequiredError";
	}
}
