import { ApiError } from "../api/errors";
import type { MessageKey } from "../i18n/en-us";

export class ShareErrors {
	static keyFor(error: unknown): MessageKey {
		if (error instanceof ApiError && error.status === 404) {
			return "share.errorNotFound";
		}
		if (error instanceof ApiError && error.status === 400) {
			return "share.errorInvalid";
		}
		return "share.errorUnavailable";
	}
}
